import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, Repository, In, EntityManager } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { QueryToken } from 'src/auth/dto/queryToken';
import path from 'path';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  completarConCeros,
  fileExists,
  formatListInvoices,
  withRetry,
} from 'src/lib/functions';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { MonedasService } from 'src/monedas/services/monedas.service';
import { FormaPagosService } from 'src/forma-pagos/services/forma-pagos.service';
import { TipoEntidadService } from 'src/tipo-entidades/services/tipo-entidades.service';
import { IgvsService } from 'src/igvs/services/igvs.service';
import { UnidadesService } from 'src/unidades/services/unidades.service';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { ConfiguracionesServices } from 'src/configuraciones/services/configuraciones.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { FormaPagosEntity } from 'src/forma-pagos/entities/forma-pagos.entity';
import { MonedaEntity } from 'src/monedas/entities/monedas.entity';
import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { InvoiceDetailsEntity } from '../entities/invoice_details.entity';
import { ConfigService } from '@nestjs/config';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { v4 as uuidv4 } from 'uuid';
import { CodesReturnSunatService } from 'src/codes-return-sunat/services/codes-return-sunat.service';
import { QueryInvoiceList } from '../dto/query-invoice-list';
import { QueryInvoice } from '../dto/query-invoice';
import { PosService } from 'src/pos/services/pos.service';
import { ClientePermission } from 'src/lib/enum/cliente.enum';
import { PosEntity } from 'src/pos/entities/pos.entity';
import { QueryResultInvoice } from '../dto/query-result-invoice';
import Redis from 'ioredis';
import { SunatService } from 'src/sunat/services/sunat.service';
import { InvoiceGateway } from 'src/gateway/invoice.gateway';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InvoiceSocketService } from 'src/socket-session/services/invoice-socket.service';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';

@Injectable()
export class InvoiceService {
  private logger = new Logger('InvoiceService');

  constructor(
    @InjectRepository(InvoiceEntity)
    private invoiceRepository: Repository<InvoiceEntity>,
    private readonly empresaService: EmpresaService,
    private readonly establecimientoService: EstablecimientoService,
    private readonly monedaService: MonedasService,
    private readonly formaPagoService: FormaPagosService,
    private readonly tipoEntidadService: TipoEntidadService,
    private readonly tipoIgvService: IgvsService,
    private readonly unidadService: UnidadesService,
    private readonly tipoDocumentoService: TipodocsService,
    private readonly configuracionesService: ConfiguracionesServices,
    private readonly posService: PosService,
    @InjectRepository(EntidadEntity)
    private clienteRepository: Repository<EntidadEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(SeriesEntity)
    private serieRepository: Repository<SeriesEntity>,
    @InjectRepository(InvoiceDetailsEntity)
    private invoiceDetailsRepository: Repository<InvoiceDetailsEntity>,
    private dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(AnulacionEntity)
    private anulacionRepository: Repository<AnulacionEntity>,
    private readonly invoiceGateway: InvoiceGateway,
    private codeReturnSunatService: CodesReturnSunatService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly sunatService: SunatService,
    @InjectQueue('invoice-submission')
    private readonly sunatQueue: Queue,
    private readonly invoiceSocketService: InvoiceSocketService,
  ) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('America/Lima'); // Establecer el huso horario de Perú como predeterminado
  }

  async upsertSale(
    invoice: CreateInvoiceDto,
    user: QueryToken,
    socketId?: string,
  ): Promise<QueryResultInvoice> {
    // 1. Realizar todas las validaciones previas fuera de la transacción
    const validationResult = await this.validateInvoiceData(invoice, user);
    const {
      empresa,
      establecimiento,
      pos,
      tipoDocumento,
      formaPago,
      tipoMoneda,
      hasPermissionToCreateClient,
      usuario,
      clienteEntity,
    } = validationResult;

    const DECIMAL = 6;

    // 2. Verificar si el invoice ya existe (fuera de la transacción)
    const existInvoice = await this.findOneInvoiceById(invoice.id);

    // 3. Verificar si el establecimiento tiene la opción de enviar a SUNAT habilitada
    const configEstablishment =
      await this.configuracionesService.getConfigEstablecimiento(
        establecimiento.id,
      );

    // Generate room identifier for notifications
    const roomId = `room_invoices_emp-${empresa.id}_est-${establecimiento.id}`;

    // 4. Iniciar una única transacción para todo el proceso
    let correlativoResult: { correlativo: string; oldCorrelativo: string } = {
      correlativo: null,
      oldCorrelativo: null,
    };

    let invoiceEntity: InvoiceEntity | null = null;

    let validation: {
      fileName: string;
      xmlSigned: string;
      xmlUnsigned: string;
    } = {
      fileName: null,
      xmlSigned: null,
      xmlUnsigned: null,
    };

    try {
      // Obtener correlativo si es necesario (fuera de la transacción para reducir tiempo de bloqueo)
      if (
        !existInvoice ||
        (existInvoice && existInvoice.serie !== invoice.serie)
      ) {
        correlativoResult = await this.getCorrelativoWithRedis(
          pos,
          invoice.serie,
        );
      } else {
        correlativoResult = {
          correlativo: existInvoice.correlativo,
          oldCorrelativo: existInvoice.correlativo,
        };
      }

      // Usar una única transacción para todo el proceso
      invoiceEntity = await this.dataSource.transaction(
        async (entityManager) => {
          // Validar serie y correlativo existente
          if (
            !existInvoice ||
            (existInvoice && existInvoice.serie !== invoice.serie)
          ) {
            const { oldCorrelativo } = correlativoResult;

            const invoiceExisting = await entityManager
              .getRepository(InvoiceEntity)
              .findOne({
                where: {
                  pos: { id: Equal(pos.id) },
                  establecimiento: { id: Equal(establecimiento.id) },
                  empresa: { id: Equal(empresa.id) },
                  tipo_doc: { id: Equal(tipoDocumento.id) },
                  serie: Equal(invoice.serie),
                  correlativo: oldCorrelativo,
                },
              });

            if (invoiceExisting) {
              const serie = `${invoice.serie}-${oldCorrelativo}`;
              throw new HttpException(
                `Ya existe un comprobante con la misma serie y correlativo: ${serie}`,
                HttpStatus.BAD_REQUEST,
              );
            }
          }

          const saleResult = existInvoice
            ? await this.updateSale(
                existInvoice,
                invoice,
                clienteEntity,
                usuario,
                pos,
                establecimiento,
                empresa,
                tipoDocumento,
                formaPago,
                tipoMoneda,
                DECIMAL,
                hasPermissionToCreateClient,
                correlativoResult.oldCorrelativo,
                entityManager,
              )
            : await this.createSale(
                invoice,
                clienteEntity,
                usuario,
                pos,
                establecimiento,
                empresa,
                tipoDocumento,
                formaPago,
                tipoMoneda,
                DECIMAL,
                hasPermissionToCreateClient,
                correlativoResult.oldCorrelativo,
                entityManager,
                configEstablishment.envio_sunat_modo,
              );

          if (socketId) {
            this.invoiceSocketService.setSocket(saleResult.id, socketId);
            this.invoiceGateway.sendEstadoSunat(
              saleResult.id,
              0,
              'GENERANDO',
              'Generando documento...',
              true,
              configEstablishment.envio_sunat_modo,
            );
          }

          // Se valida documento excepto borradores
          if (!saleResult.borrador) {
            const startTime = Date.now();

            validation = await withRetry(
              async () => {
                const result = await this.sunatService.validateInvoiceFactura(
                  saleResult,
                );
                const elapsed = Date.now() - startTime;

                if (elapsed > 30000) {
                  // Log if it takes more than 30 seconds
                  this.logger.warn(
                    `SUNAT validation took ${elapsed}ms to complete`,
                  );
                }

                return result;
              },
              3, // 3 retries
              5000, // 5 seconds between retries
              (error) => {
                // Only retry on timeout or connection errors
                const isTimeoutError =
                  error.message?.includes('Maximum') ||
                  error.message?.includes('time') ||
                  error.message?.includes('seconds') ||
                  error.message?.includes('exceeded');

                this.logger.warn(
                  `SUNAT validation error: ${error.message}. ${
                    isTimeoutError ? 'Will retry.' : 'Will not retry.'
                  }`,
                );
                return isTimeoutError;
              },
            );
          }

          // La transacción se confirmará automáticamente al finalizar este bloque
          return saleResult;
        },
      );

      // Enviar a SUNAT si está habilitado
      if (
        !invoiceEntity.borrador &&
        configEstablishment.envio_sunat_modo !== EnvioSunatModo.MANUAL &&
        configEstablishment.envio_sunat_modo !== EnvioSunatModo.NO_ENVIA
      ) {
        // Añadir a la cola de procesamiento
        await this.sunatQueue.add(
          'submitInvoice',
          {
            invoiceId: invoiceEntity.id,
            roomId: roomId,
            fileName: validation.fileName,
            xmlSigned: validation.xmlSigned,
            xmlUnsigned: validation.xmlUnsigned,
            sendMode: configEstablishment.envio_sunat_modo,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
            delay:
              configEstablishment.envio_sunat_modo === EnvioSunatModo.INMEDIATO
                ? 0
                : 60000, //Envio programado
          },
        );
      } else {
        this.invoiceGateway.sendEstadoSunat(
          invoiceEntity.id,
          0,
          'CREADO',
          `Documento ${
            invoiceEntity.borrador ? 'guardado' : 'creado'
          } correctamente`,
          false,
          configEstablishment.envio_sunat_modo,
        );
        this.invoiceSocketService.deleteSocket(invoiceEntity.id);
      }
    } catch (e) {
      this.logger.error(`Error upsertSale.transaction: ${e.message}`);

      // Si es otro tipo de error, lo propagamos
      throw e;
    }

    if (invoiceEntity.borrador) {
      validation.fileName = `${invoiceEntity.empresa.ruc}-${invoiceEntity.tipo_doc.codigo}-${invoiceEntity.serie}-${invoiceEntity.correlativo}`;
    }

    // 5. Format invoice for response
    const invoiceFormatted = await formatListInvoices(
      {
        ...invoiceEntity,
        estado_operacion: 0,
      },
      validation.fileName,
    );

    return this.handleInvoiceResponse({
      invoiceEntity,
      fileName: validation.fileName,
      correlativoResult,
      username: usuario.username,
      roomId,
      invoiceFormated: invoiceFormatted,
      responseType: invoiceEntity.borrador ? 'draft' : 'normal',
      sendMode: configEstablishment.envio_sunat_modo,
    });
  }

  async sendSale(invoiceId: number): Promise<void> {
    // 1. Verificar si el invoice ya existe (fuera de la transacción)
    const invoice = await this.findOneInvoiceById(invoiceId);

    // 2. Generate room identifier for notifications
    const roomId = `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`;

    const fileName = `${invoice.empresa.ruc}-${invoice.tipo_doc.codigo}-${invoice.serie}-${invoice.correlativo}`;

    const invoiceFormatted = await formatListInvoices(
      {
        ...invoice,
        estado_operacion: 1,
      },
      fileName,
    );

    this.invoiceGateway.server
      .to(roomId)
      .emit('server::newInvoice', invoiceFormatted);

    // 3. Verificar si el establecimiento tiene la opción de enviar a SUNAT habilitada
    const configEstablishment =
      await this.configuracionesService.getConfigEstablecimiento(
        invoice.establecimiento.id,
      );

    if (configEstablishment.envio_sunat_modo !== EnvioSunatModo.MANUAL) {
      throw new HttpException(
        `No puedes enviar a SUNAT por envio MANUAL, tu metodo actual es ${configEstablishment.envio_sunat_modo}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Se valida documento excepto borradores
      if (
        !invoice.borrador &&
        configEstablishment.envio_sunat_modo === EnvioSunatModo.MANUAL
      ) {
        // Añadir a la cola de procesamiento
        await this.sunatQueue.add(
          'submitInvoiceManual',
          {
            invoiceId: invoice.id,
            roomId: roomId,
            sendMode: configEstablishment.envio_sunat_modo,
          },
          {
            jobId: invoice.id,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
            delay: 0,
            debounce: {
              id: `${roomId}_invoice-${invoice.id}`,
              ttl: 40000, // 40 segundos
            },
          },
        );
      }
    } catch (e) {
      this.logger.error(`Error sendSale.toSunat: ${e.message}`);

      // Si es otro tipo de error, lo propagamos
      throw e;
    }
  }

  async getCorrelativoWithRedis(pos: PosEntity, serie: string) {
    // Crear una clave única para el lock de Redis
    const lockKey = `lock:serie:${pos.id}:${serie}`;
    // Crear una clave única para el contador de correlativo
    const redisKey = `serie:${pos.id}:${serie}`;

    // Adquirir un lock distribuido con tiempo de expiración de 2 segundos
    const lockAcquired = await this.redisClient.set(
      lockKey,
      '1',
      'EX',
      2,
      'NX',
    );

    if (!lockAcquired) {
      // Si no podemos adquirir el lock, otro proceso está actualizando el correlativo
      throw new HttpException(
        'Sistema procesando otra venta con la misma serie. Intente nuevamente en unos segundos.',
        HttpStatus.CONFLICT, // 409 Conflict - mejor código para esta situación
      );
    }

    try {
      const foundSerie = await this.serieRepository.findOne({
        where: {
          pos: { id: Equal(pos.id) },
          serie: Equal(serie),
        },
      });

      if (!foundSerie) {
        throw new HttpException('Serie no encontrada', HttpStatus.BAD_REQUEST);
      }

      // Obtener el valor actual en Redis
      const currentRedisValue = await this.redisClient.get(redisKey);

      // Implementar una transacción Redis para operaciones atómicas
      const multi = this.redisClient.multi();

      // Si Redis y DB están desincronizados, sincronizar Redis con DB
      if (
        !currentRedisValue ||
        Number(currentRedisValue) !== Number(foundSerie.numero)
      ) {
        this.logger.warn(
          `⚠️ Desincronización detectada: Redis(${currentRedisValue}) ≠ BD(${foundSerie.numero}) para serie ${serie}`,
        );
        multi.set(redisKey, foundSerie.numero);
      }

      // Incrementar y obtener el nuevo valor en una sola operación atómica
      multi.incr(redisKey);

      // Ejecutar todas las operaciones Redis en una transacción
      const results = await multi.exec();

      // El último resultado contiene el nuevo valor incrementado
      const newNumero = results[results.length - 1][1] as number;
      const oldNumero = newNumero - 1;

      // Actualizar la base de datos con el nuevo correlativo
      await this.serieRepository.update(
        { id: foundSerie.id },
        { numero: String(newNumero) },
      );

      // Formatear los correlativos y retornarlos.
      return {
        correlativo: completarConCeros(String(newNumero)),
        oldCorrelativo: completarConCeros(String(oldNumero)),
      };
    } catch (error) {
      this.logger.error(
        `Error getCorrelativoWithRedis: ${error.message}`,
        error.stack,
      );

      // Re-lanzar excepciones HTTP directamente
      if (error instanceof HttpException) {
        throw error;
      }

      // Transformar otros errores en HTTP exceptions
      throw new HttpException(
        `Error al obtener el correlativo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Liberar el lock independientemente del resultado
      await this.redisClient.del(lockKey);
    }
  }

  // Unified helper method to handle both draft and normal responses
  private handleInvoiceResponse({
    invoiceEntity,
    fileName,
    correlativoResult,
    username,
    roomId,
    invoiceFormated,
    responseType,
    sendMode,
  }: {
    invoiceEntity: InvoiceEntity;
    fileName: string;
    correlativoResult: {
      correlativo: string;
      oldCorrelativo: string;
    };
    username: string;
    roomId: string;
    invoiceFormated: QueryInvoiceList;
    responseType: 'draft' | 'normal';
    sendMode: string;
  }): QueryResultInvoice {
    // Determine response configuration based on type
    const config = {
      draft: {
        logMessage: `${username}: ${fileName} creado y de tipo BORRADOR(No envia SUNAT)`,
        message: 'Guardado. Los borradores no se envian a sunat.',
        codigo: 'BORRADOR',
        codigoInt: null,
        pdfA4: null,
      },
      normal: {
        logMessage: `${username}: ${fileName} creado y de tipo NORMAL(Segun configuracion del establecimiento = ${
          sendMode === EnvioSunatModo.NO_ENVIA ? 'NO' : 'SI'
        } envia ha SUNAT)`,
        message:
          sendMode === EnvioSunatModo.NO_ENVIA
            ? 'Generado con éxito. Segun configuraciones este documento no envia a SUNAT.'
            : 'Generado con éxito.',
        codigo: 'CREADO',
        codigoInt: null,
        pdfA4: invoiceFormated.pdfA4,
      },
    }[responseType];

    // Log to server
    this.logger.log(config.logMessage);

    // Emit notifications
    this.invoiceGateway.server
      .to(roomId)
      .emit('server::newInvoice', invoiceFormated);
    this.invoiceGateway.server.to(roomId).emit('server::notifyInvoice', {
      type: 'sunat.success',
      correlativo: invoiceEntity.correlativo,
      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
      message: `Se ha creado el comprobante ${fileName}`,
    });

    //Calculamos los totales del invoice y obtendran solo 2 decimales
    const totales = this.sunatService.obtenerTotalesInvoices(
      invoiceEntity.invoices_details,
    );

    return {
      invoice: invoiceEntity,
      fileName: fileName,
      message: config.message,
      codigo_respuesta_sunat: config.codigo,
      codigo_respuesta_sunat_int: config.codigoInt,
      documento: `${invoiceEntity.tipo_doc.tipo_documento.toUpperCase()} ELECTRÓNICA`,
      serie: invoiceEntity.serie,
      correlativo: correlativoResult.correlativo,
      correlativo_registrado: correlativoResult.oldCorrelativo,
      total: `${invoiceEntity.tipo_moneda.simbolo} ${totales.mtoOperGravadas}`,
      xml: null,
      cdr: null,
      pdfA4: config.pdfA4,
      sendMode: sendMode,
    };
  }

  async createSale(
    invoice: CreateInvoiceDto,
    clienteEntity: EntidadEntity,
    usuario: UserEntity,
    pos: PosEntity,
    establecimiento: EstablecimientoEntity,
    empresa: EmpresaEntity,
    tipoDocumento: TipodocsEntity,
    formaPago: FormaPagosEntity,
    tipoMoneda: MonedaEntity,
    decimales: number,
    hasPermissionToCreateClient: boolean,
    correlativo: string,
    manager: EntityManager,
    modoEnvio: string,
  ) {
    if (!manager) {
      throw new Error('Este método debe ejecutarse dentro de una transacción');
    }

    try {
      //Validamos la existencia de los tipos de productos, unidad, etc...
      const details = await this.sunatService.validarYFormatearDetalle(
        invoice.details,
        decimales,
      );

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.sunatService.obtenerTotalesInvoices(details);

      //Seteamos nuestro obj invoice con sus productos y totales
      const newInvoice: InvoiceEntity = {
        envio_sunat_modo: modoEnvio,
        pos: pos,
        tipo_operacion: invoice.tipo_operacion,
        tipo_doc: tipoDocumento,
        serie: invoice.serie,
        correlativo: correlativo,
        fecha_emision: invoice.fecha_emision,
        fecha_vencimiento: invoice.fecha_vencimiento,
        forma_pago: formaPago,
        tipo_moneda: tipoMoneda,
        empresa,
        establecimiento,
        usuario,
        cliente: clienteEntity,
        mto_operaciones_gravadas: totales.mtoOperGravadas,
        mto_operaciones_exoneradas: totales.mtoOperExoneradas,
        mto_operaciones_inafectas: totales.mtoOperInafectas,
        mto_operaciones_exportacion: totales.mtoOperExportacion,
        mto_operaciones_gratuitas: totales.mtoOperGratuitas,
        mto_igv: totales.mtoIGV,
        mto_igv_gratuitas: totales.mtoIGVGratuitas,
        porcentaje_igv: 18,
        entidad: hasPermissionToCreateClient ? null : invoice.cliente,
        entidad_tipo: hasPermissionToCreateClient ? null : invoice.tipo_entidad,
        entidad_documento: hasPermissionToCreateClient ? null : invoice.ruc,
        entidad_direccion: hasPermissionToCreateClient
          ? null
          : invoice.direccion,
        borrador: invoice.borrador,
        invoices_details: details,
        observaciones_invoice:
          invoice.observaciones.length > 0
            ? invoice.observaciones.join('|')
            : null,
      };

      // Creamos el invoice
      const invoiceObj = manager.create(InvoiceEntity, newInvoice);

      // Guardamos el invoice
      const invoiceEntity = await manager.save(InvoiceEntity, invoiceObj);

      //Recorremos los productos para crear el detalle del invoice
      await Promise.all(
        details.map((producto) => {
          const objDetail = manager.create(InvoiceDetailsEntity, {
            ...producto,
            invoice: invoiceEntity,
          });
          return manager.save(InvoiceDetailsEntity, objDetail);
        }),
      );

      return invoiceEntity;
    } catch (e) {
      this.logger.error(e);
      throw new HttpException(
        `Error al crear la venta intente nuevamente.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSale(
    invoiceExisting: InvoiceEntity,
    newDataInvoice: CreateInvoiceDto,
    clienteEntity: EntidadEntity,
    usuario: UserEntity,
    pos: PosEntity,
    establecimiento: EstablecimientoEntity,
    empresa: EmpresaEntity,
    tipoDocumento: TipodocsEntity,
    formaPago: FormaPagosEntity,
    tipoMoneda: MonedaEntity,
    decimales: number,
    hasPermissionToCreateClient: boolean,
    correlativoResult: string,
    manager: EntityManager,
  ) {
    if (!manager) {
      throw new Error('Este método debe ejecutarse dentro de una transacción');
    }

    try {
      //Validamos la existencia de los tipos de productos, unidad, etc...
      const details = await this.sunatService.validarYFormatearDetalle(
        newDataInvoice.details,
        decimales,
      );

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.sunatService.obtenerTotalesInvoices(details);

      // Modificamos lo necesario
      this.invoiceRepository.merge(invoiceExisting, {
        ...newDataInvoice,
        envio_sunat_modo: invoiceExisting.envio_sunat_modo,
        pos: pos,
        tipo_doc: tipoDocumento,
        forma_pago: formaPago,
        tipo_moneda: tipoMoneda,
        empresa,
        establecimiento,
        usuario,
        cliente: clienteEntity,
        serie:
          invoiceExisting.serie !== newDataInvoice.serie
            ? newDataInvoice.serie
            : invoiceExisting.serie,
        correlativo: correlativoResult,
        mto_operaciones_gravadas: totales.mtoOperGravadas,
        mto_operaciones_exoneradas: totales.mtoOperExoneradas,
        mto_operaciones_inafectas: totales.mtoOperInafectas,
        mto_operaciones_exportacion: totales.mtoOperExportacion,
        mto_operaciones_gratuitas: totales.mtoOperGratuitas,
        mto_igv: totales.mtoIGV,
        mto_igv_gratuitas: totales.mtoIGVGratuitas,
        porcentaje_igv: 18,
        entidad: hasPermissionToCreateClient ? null : newDataInvoice.cliente,
        entidad_tipo: hasPermissionToCreateClient
          ? null
          : newDataInvoice.tipo_entidad,
        entidad_documento: hasPermissionToCreateClient
          ? null
          : newDataInvoice.ruc,
        entidad_direccion: hasPermissionToCreateClient
          ? null
          : newDataInvoice.direccion,
        invoices_details: details,
        observaciones_invoice:
          newDataInvoice.observaciones.length > 0
            ? newDataInvoice.observaciones.join('|')
            : null,
      });

      // Guardamos el invoice
      const invoiceEntity = await manager.save(InvoiceEntity, invoiceExisting);

      // Modificamos los productos
      const currentProducts = await manager.find(InvoiceDetailsEntity, {
        relations: {
          invoice: true,
        },
        where: {
          invoice: {
            id: Equal(invoiceExisting.id),
          },
        },
      });

      // Crear un mapa para los productos actuales usando el id
      const currentProductsMap = new Map(
        currentProducts.map((product) => [product.id, product]),
      );

      //Validamos que ningun producto que se este modificando no sea de otro cpe
      for (let index = 0; index < details.length; index++) {
        const product = details[index];

        if (product.id) {
          const findProduct = await manager.findOne(InvoiceDetailsEntity, {
            relations: {
              invoice: true,
            },
            where: {
              id: Equal(product.id),
            },
          });

          if (findProduct.invoice.id !== invoiceExisting.id) {
            throw new HttpException(
              'No puedes modificar este producto.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }

      // Crear un mapa para los nuevos productos
      const newProductsMap = new Map(
        details.map((product) => [product.id, product]),
      );

      // Iterar sobre los productos actuales para ver cuáles eliminar
      for (const currentProduct of currentProducts) {
        if (!newProductsMap.has(currentProduct.id)) {
          // Si el producto actual no está en la lista de nuevos productos, eliminarlo
          await manager.delete(InvoiceDetailsEntity, currentProduct.id);
        }
      }

      // Iterar sobre los nuevos productos para ver cuáles agregar o actualizar
      for (const newProduct of details) {
        if (currentProductsMap.has(newProduct.id)) {
          // Si el producto nuevo ya existe, actualizarlo
          await manager.update(
            InvoiceDetailsEntity,
            { id: newProduct.id },
            newProduct,
          );
        } else {
          // Si el producto nuevo no existe, agregarlo
          const objDetail = manager.create(InvoiceDetailsEntity, {
            ...newProduct,
            invoice: invoiceExisting,
          });

          //Guardamos detalle del invoice
          await manager.save(objDetail);
        }
      }

      return invoiceEntity;
    } catch (e) {
      throw new HttpException(
        `Error al actualizar la venta intente nuevamente.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateInvoiceData(invoice: CreateInvoiceDto, user: QueryToken) {
    const { tokenEntityFull, token_of_permisos } = user;
    const { empresas } = tokenEntityFull;
    let clienteEntity: EntidadEntity | null = null;

    // Validamos que no pueda emitir un invoice valido
    const existInvoice = await this.findOneInvoiceById(invoice.id);

    if (existInvoice && !existInvoice.borrador) {
      throw new HttpException(
        'No puedes modificar un CPE ya emitido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos empresa emisora
    const empresa = (await this.empresaService.findOneEmpresaById(
      invoice.empresa,
      true,
    )) as EmpresaEntity;

    //Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
    const existEmpresa = empresas.find((emp) => emp.id === empresa.id);

    if (!existEmpresa || !existEmpresa.estado) {
      throw new HttpException(
        'No puedes emitir facturas para esta empresa',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos establecimiento emisor
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        invoice.establecimiento,
      );

    if (!establecimiento.estado) {
      throw new HttpException(
        'El establecimiento está desactivado.',
        HttpStatus.NOT_FOUND,
      );
    }

    //Validamos si el establecimiento emisor pertenece a las empresas asignadas al usuario
    const existEstablecimiento = existEmpresa.establecimientos.find(
      (est) => est.id === establecimiento.id,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'No puedes emitir facturas para este establecimiento',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pos = await this.posService.findPOSById(invoice.pos);

    if (!pos.estado) {
      throw new HttpException('El POS está desactivado.', HttpStatus.NOT_FOUND);
    }

    //Validamos si el POS pertenece al establecimiento
    const existPos = existEstablecimiento.pos.find(
      (item) => item.id === pos.id,
    );

    if (!existPos) {
      throw new HttpException(
        'No puedes emitir facturas para este POS',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos si el tipo de documento del body es permitido en el establecimiento
    const tipDoc = (existPos as any).documentos.find(
      (doc) => doc.codigo === invoice.tipo_documento,
    );

    if (!tipDoc || !tipDoc.estado) {
      throw new HttpException(
        'No puedes emitir este tipo de documento o se encuentra desactivado',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Obtenmos serie del establecimiento
    const serie = tipDoc.series.find(
      (item: any) => item.serie === invoice.serie,
    );

    if (!serie || !serie.estado) {
      throw new HttpException(
        'No puedes emitir este tipo de documento con esta serie o se encuentra desactivado',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos si las entidades existen para que se pueda emitir el cpe
    const tipoDocumento =
      await this.tipoDocumentoService.findOneTipoDocByCodigo(
        invoice.tipo_documento,
      );

    const formaPago = await this.formaPagoService.findOneFormaPagoByformaPago(
      invoice.forma_pago,
    );

    const tipoMoneda = await this.monedaService.findOneMonedaByAbrstandar(
      invoice.moneda,
    );

    const tipoEntidad = await this.tipoEntidadService.findTipoEntidadByCodigo(
      invoice.tipo_entidad,
    );

    // Validar usuario registrador
    const usuario = await this.userRepository.findOne({
      where: { _id: String(user.tokenEntityFull._id) },
    });

    // Validar si tiene permiso para crear clientes(canCreate_clientes)
    // Si el usuario no tiene el permiso los datos del cliente ira directamente en el invoice
    const hasPermissionToCreateClient = token_of_permisos.includes(
      ClientePermission.CreateClientes,
    );

    if (hasPermissionToCreateClient) {
      // Buscar si el cliente ya existe en la empresa
      clienteEntity = await this.clienteRepository.findOne({
        relations: {
          tipo_entidad: true,
        },
        where: {
          numero_documento: invoice.ruc,
          empresa: {
            id: empresa.id,
          },
        },
      });

      // Si el cliente no existe, lo creamos y guardamos
      if (!clienteEntity) {
        const clienteObj = this.clienteRepository.create({
          tipo_entidad: tipoEntidad,
          entidad: invoice.cliente,
          direccion: invoice.direccion,
          numero_documento: invoice.ruc,
          usuario,
          empresa,
        });

        clienteEntity = await this.clienteRepository.save(clienteObj);
      }
    }

    return {
      empresa,
      establecimiento,
      pos,
      tipDoc,
      tipoDocumento,
      formaPago,
      tipoMoneda,
      tipoEntidad,
      serie,
      token_of_permisos,
      hasPermissionToCreateClient,
      usuario,
      clienteEntity,
    };
  }

  async updateInvoiceFields(
    idInvoice: number,
    fieldsToUpdate: Partial<InvoiceEntity>,
    errorMessage = 'Error al actualizar la factura',
  ): Promise<InvoiceEntity> {
    try {
      await this.invoiceRepository.update(idInvoice, fieldsToUpdate);
      return this.invoiceRepository.findOne({ where: { id: idInvoice } });
    } catch (e) {
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  async findAllProductsByInvoice(idInvoice: number) {
    try {
      return await this.invoiceDetailsRepository.find({
        relations: {
          unidad: true,
          tipAfeIgv: true,
        },
        where: {
          invoice: {
            id: idInvoice,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar los productos de la factura',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOneInvoiceById(idInvoice: number) {
    let invoice: InvoiceEntity = null;

    try {
      invoice = await this.invoiceRepository.findOne({
        relations: {
          tipo_doc: true,
          cliente: { tipo_entidad: true },
          empresa: true,
          establecimiento: true,
          pos: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
          invoices_details: { tipAfeIgv: true, unidad: true },
        },
        where: {
          id: Equal(idInvoice),
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar la factura InvoiceService.findOneInvoiceById',
        HttpStatus.BAD_REQUEST,
      );
    }

    return invoice;
  }

  async findOneInvoice(
    serie: string,
    numero: string,
    empresa: number,
    establecimiento: number,
  ) {
    let invoice: InvoiceEntity = null;

    try {
      invoice = await this.invoiceRepository.findOne({
        relations: {
          invoices_details: {
            tipAfeIgv: true,
            unidad: true,
          },
          tipo_moneda: true,
          forma_pago: true,
          tipo_doc: true,
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
          usuario: true,
          pos: true,
        },
        where: {
          serie: Equal(serie),
          correlativo: Equal(numero),
          empresa: {
            id: Equal(empresa),
          },
          establecimiento: {
            id: Equal(establecimiento),
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar la factura',
        HttpStatus.BAD_REQUEST,
      );
    }

    // if (!invoice) {
    //   throw new HttpException('El CPE no existe.', HttpStatus.BAD_REQUEST);
    // }

    return invoice;
  }

  //CRON SERVER
  async findAllInvoicesCron(
    idEmpresa: number,
    idEstablecimiento: number,
    operacion: number,
    sendMode?: string,
  ) {
    try {
      const where: any = {
        empresa: { id: Equal(idEmpresa) },
        establecimiento: { id: Equal(idEstablecimiento) },
        estado_operacion: Equal(operacion),
      };

      if (sendMode !== undefined) {
        where.envio_sunat_modo = Equal(sendMode);
      }

      return await this.invoiceRepository.find({
        relations: {
          tipo_doc: true,
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
          pos: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
          invoices_details: {
            tipAfeIgv: true,
            unidad: true,
          },
        },
        where,
      });
    } catch (e) {
      throw new HttpException(
        `Error al buscar comprobantes InvoiceService.findAllInvoicesCron`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //API
  async listInvoices(
    user: QueryToken,
    idEmpresa: number,
    idEstablecimiento: number,
    page: number,
    limit: number,
  ): Promise<QueryInvoice> {
    const pageSize = Number(limit);
    const offset = Number(page) * pageSize;
    const empresasAsignadas = user.tokenEntityFull.empresas;

    // Validamos la existencia de la empresa
    const empresa = (await this.empresaService.findOneEmpresaById(
      idEmpresa,
      true,
    )) as EmpresaEntity;

    // Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
    const existEmpresa = empresasAsignadas.find((emp) => emp.id === empresa.id);

    if (!existEmpresa) {
      throw new HttpException(
        'La empresa en consulta no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validamos la existencia del establecimiento
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        idEstablecimiento,
      );

    // Validamos si el establecimiento emisor pertenece a las empresas asignadas al usuario
    const existEstablecimiento = existEmpresa.establecimientos.find(
      (est) => est.id === establecimiento.id,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'El establecimiento en consulta no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const invoices = await this.invoiceRepository.find({
        take: pageSize,
        skip: offset,
        relations: {
          tipo_doc: true,
          cliente: { tipo_entidad: true },
          empresa: true,
          establecimiento: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
          invoices_details: { tipAfeIgv: true, unidad: true },
          pos: true,
        },
        where: {
          empresa: { id: Equal(idEmpresa) },
          establecimiento: { id: Equal(idEstablecimiento) },
        },
        order: { createdAt: 'DESC' },
      });

      const countInvoices = await this.invoiceRepository.count({
        where: {
          empresa: { id: idEmpresa },
          establecimiento: { id: idEstablecimiento },
        },
      });

      const urlStatic = await this.configService.get<string>(
        'URL_FILES_STATIC',
      );
      const pageCount = Math.ceil(countInvoices / pageSize);

      const items: QueryInvoiceList[] = await Promise.all(
        invoices.map(async (invoice) => {
          const ruc = invoice.empresa.ruc;
          const tipoDoc = invoice.tipo_doc.codigo;
          const nomDoc = invoice.tipo_doc.tipo_documento;
          const serie = invoice.serie;
          const correlativo = invoice.correlativo;
          const establecimientoCode = `${invoice.establecimiento.codigo}`;

          let pathDirFirma = '',
            pathDirCDR = '',
            pathStaticFirma = '',
            pathStaticCDR = '';

          //null(no enviado), 1(enviado con ticket), 2(anulacion aceptado), 3(anulacion rechazada)
          if (invoice.estado_anulacion === 2) {
            const anulacion = await this.anulacionRepository.findOneBy({
              invoice: { id: invoice.id },
            });
            if (anulacion) {
              const fechaAnulacion = dayjs(anulacion.fecha_comunicacion).format(
                'YYYYMMDD',
              );
              const correlativoAnulacion = anulacion.numero;
              const fileName = `${ruc}-RA-${fechaAnulacion}-${correlativoAnulacion}`;

              const rutaFirma = `${ruc}/${establecimientoCode}/${nomDoc}/BAJA/FIRMA/${fileName}.xml`;
              const rutaCDR = `${ruc}/${establecimientoCode}/${nomDoc}/BAJA/RPTA/R-${fileName}.zip`;

              pathDirFirma = path.join(
                process.cwd(),
                `uploads/files/${rutaFirma}`,
              );
              pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);
              pathStaticFirma = `${urlStatic}/${rutaFirma}`;
              pathStaticCDR = `${urlStatic}/${rutaCDR}`;
            }
          }
          // 0(creado), 1(enviando), 2(aceptado), 3(rechazado)
          else if ([0, 2, 3].includes(invoice.estado_operacion)) {
            const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
            const rutaFirma = `${ruc}/${establecimientoCode}/${nomDoc}/FIRMA/${fileName}.xml`;
            const rutaCDR = `${ruc}/${establecimientoCode}/${nomDoc}/RPTA/R-${fileName}.zip`;

            pathDirFirma = path.join(
              process.cwd(),
              `uploads/files/${rutaFirma}`,
            );
            pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);
            pathStaticFirma = `${urlStatic}/${rutaFirma}`;
            pathStaticCDR = `${urlStatic}/${rutaCDR}`;
          }

          const [firmaExists, cdrExists] = await Promise.all([
            fileExists(pathDirFirma),
            fileExists(pathDirCDR),
          ]);

          return {
            id: invoice.id,
            tipo_operacion: invoice.tipo_operacion,
            serie: invoice.serie,
            correlativo: invoice.correlativo,
            fecha_vencimiento: invoice.fecha_vencimiento,
            mto_operaciones_gravadas: invoice.mto_operaciones_gravadas,
            mto_operaciones_exoneradas: invoice.mto_operaciones_exoneradas,
            mto_operaciones_inafectas: invoice.mto_operaciones_inafectas,
            mto_operaciones_exportacion: invoice.mto_operaciones_exportacion,
            mto_operaciones_gratuitas: invoice.mto_operaciones_gratuitas,
            mto_igv: invoice.mto_igv,
            mto_igv_gratuitas: invoice.mto_igv_gratuitas,
            porcentaje_igv: invoice.porcentaje_igv,
            estado_operacion: invoice.estado_operacion,
            estado_anulacion: invoice.estado_anulacion,
            respuesta_sunat_codigo: invoice.respuesta_sunat_codigo,
            respuesta_sunat_descripcion: invoice.respuesta_sunat_descripcion,
            respuesta_anulacion_codigo: invoice.respuesta_anulacion_codigo,
            respuesta_anulacion_descripcion:
              invoice.respuesta_anulacion_descripcion,
            observaciones_sunat: invoice.observaciones_sunat,
            observaciones: invoice.observaciones_invoice
              ? invoice.observaciones_invoice.split('|').map((item) => ({
                  observacion: item,
                  uuid: uuidv4(),
                }))
              : [],
            borrador: invoice.borrador,
            documento: nomDoc,
            tipo_documento: tipoDoc,
            cliente: invoice.cliente
              ? invoice.cliente.entidad
              : invoice.entidad,
            cliente_direccion: invoice.cliente
              ? invoice.cliente.direccion
              : invoice.entidad_direccion,
            cliente_cod_doc: invoice.cliente
              ? invoice.cliente.tipo_entidad.codigo
              : invoice.entidad_tipo,
            cliente_num_doc: invoice.cliente
              ? invoice.cliente.numero_documento
              : invoice.entidad_documento,
            empresa: invoice.empresa.id,
            establecimiento: invoice.establecimiento.id,
            pos: invoice.pos.id,
            envio_sunat_modo: invoice.envio_sunat_modo,
            usuario: `${invoice.usuario.nombres} ${invoice.usuario.apellidos}`,
            moneda_abrstandar: invoice.tipo_moneda.abrstandar,
            moneda_simbolo: invoice.tipo_moneda.simbolo,
            fecha_registro: invoice.createdAt,
            fecha_emision: invoice.fecha_emision,
            forma_pago: invoice.forma_pago.forma_pago,
            cdr: cdrExists ? pathStaticCDR : '#',
            xml: firmaExists ? pathStaticFirma : '#',
            pdfA4: `${urlStatic}/${ruc}/${establecimientoCode}/${nomDoc}/PDF/A4/test.pdf`,
            status: [0, 2, 3].includes(invoice.estado_operacion),
            details: invoice.invoices_details.map((item, i) => ({
              id: item.id,
              posicionTabla: i,
              uuid: uuidv4(),
              cantidad: item.cantidad,
              codigo: item.codigo,
              descripcion: item.descripcion,
              mtoValorUnitario: item.mtoValorUnitario,
              porcentajeIgv: item.porcentajeIgv,
              tipAfeIgv: item.tipAfeIgv.codigo,
              unidad: item.unidad.codigo,
            })),
          };
        }),
      );

      return {
        statusCode: 'success',
        pageSize,
        pageCount,
        rowCount: countInvoices,
        items,
      };
    } catch (e) {
      throw new HttpException(
        'Error al buscar los cpes listado',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //SOCKET
  async getInvoicesToNotify(idEmpresa: number, idEstablecimiento: number) {
    try {
      return await this.invoiceRepository.find({
        relations: {
          tipo_doc: true,
          cliente: true,
          empresa: true,
          establecimiento: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
        },
        where: {
          empresa: {
            id: idEmpresa,
          },
          establecimiento: {
            id: idEstablecimiento,
          },
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar los cpes listado InvoiceService.getInvoicesToNotify',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
