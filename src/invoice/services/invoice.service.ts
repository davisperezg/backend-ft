import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, Repository, In, EntityManager } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import * as fs from 'fs';
import axios from 'axios';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { QueryToken } from 'src/auth/dto/queryToken';
import path from 'path';
import { docDefinitionA4 } from 'src/lib/const/pdf';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  completarConCeros,
  fileExists,
  getPdf,
  guardarArchivo,
  numeroALetras,
  quitarCerosIzquierda,
  round,
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
import { TipoEntidadEntity } from 'src/tipo-entidades/entities/tipo-entidades.entity';
import { setTimeout } from 'timers/promises';
import { InvoiceDetailsEntity } from '../entities/invoice_details.entity';
import {
  CODIGO_GRAVADA_ONEROSA,
  CODIGOS_GRAVADAS_GRATUITAS,
  PORCENTAJES_IGV_DISPONIBLES,
  PORCENTAJE_IGV_GRAVADA,
  CODIGOS_INAFECTAS_GRATUITAS,
  CODIGO_EXONERADA_ONEROSA,
  CODIGO_INAFECTA_ONEROSA,
  CODIGO_EXPORTACION,
  PORCENTAJE_IGV_GRATUITA,
} from 'src/lib/const/consts';
import { ConfigService } from '@nestjs/config';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { InvoiceGateway } from '../gateway/invoice.gateway';
import { v4 as uuidv4 } from 'uuid';
import { QueryTotales } from '../dto/query-totales';
import { QuerySunat } from '../dto/query-res_sunat';
import { CodesReturnSunatService } from 'src/codes-return-sunat/services/codes-return-sunat.service';
import { QueryInvoiceList } from '../dto/query-invoice-list';
import { QueryInvoice } from '../dto/query-invoice';
import { PosService } from 'src/pos/services/pos.service';
import { ClientePermission } from 'src/lib/enum/cliente.enum';
import { PosEntity } from 'src/pos/entities/pos.entity';
import { QueryResultInvoice } from '../dto/query-result-invoice';
import Redis from 'ioredis';

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
  ) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('America/Lima'); // Establecer el huso horario de Perú como predeterminado
  }

  async upsertSale(
    invoice: CreateInvoiceDto,
    user: QueryToken,
  ): Promise<QueryResultInvoice> {
    // 1. Realizar todas las validaciones previas fuera de la transacción
    const validationResult = await this.validateInvoiceData(invoice, user);
    const {
      empresa,
      establecimiento,
      pos,
      serie,
      tipDoc,
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
    const shouldSendToSunat = establecimiento.configsEstablecimiento.some(
      (config) => config.enviar_inmediatamente_a_sunat,
    );

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
              );

          // Se valida documento excepto borradores
          if (!saleResult.borrador) {
            validation = await this.validateInvoiceDocument(saleResult);
          }

          // La transacción se confirmará automáticamente al finalizar este bloque
          return saleResult;
        },
      );

      // Enviar a SUNAT dentro de la transacción si está habilitado
      let responseInvoiceSunat: QueryResultInvoice | null = null;
      if (shouldSendToSunat && !invoiceEntity.borrador) {
        const invoiceFormatted = await this.formatListInvoices(
          { ...invoiceEntity, estado_operacion: 0 },
          validation.fileName,
        );

        responseInvoiceSunat = await this.procesarEnvioSunat(
          invoiceEntity,
          invoiceFormatted,
          validation.fileName,
          validation.xmlSigned,
          validation.xmlUnsigned,
        );
      }

      // Si la opción es envío directo a SUNAT y ya se procesó, retornamos ese resultado
      if (
        shouldSendToSunat &&
        !invoiceEntity.borrador &&
        responseInvoiceSunat
      ) {
        return responseInvoiceSunat;
      }
    } catch (e) {
      this.logger.error(`Error upsertSale.transaction: ${e.message}`);

      // Si es otro tipo de error, lo propagamos
      throw e;
    }

    // 5. Format invoice for response
    const invoiceFormatted = await this.formatListInvoices(
      { ...invoiceEntity, estado_operacion: 0 },
      validation.fileName,
    );

    // 6. Generate room identifier for notifications
    const roomId = `room_invoices_emp-${empresa.id}_est-${establecimiento.id}`;

    return this.handleInvoiceResponse({
      invoiceEntity,
      fileName: validation.fileName,
      correlativoResult,
      username: usuario.username,
      roomId,
      invoiceFormated: invoiceFormatted,
      responseType: invoiceEntity.borrador ? 'draft' : 'normal',
    });
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
      console.log(oldNumero, newNumero);
      // Actualizar la base de datos con el nuevo correlativo
      await this.serieRepository.update(
        { id: foundSerie.id },
        { numero: String(newNumero) },
      );

      // Formatear los correlativos y retornarlos
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
  }): QueryResultInvoice {
    // Determine response configuration based on type
    const config = {
      draft: {
        logMessage: `${username}-${fileName} creado y de tipo BORRADOR(No envia SUNAT)`,
        codigo: 'VALID_TRASH',
        codigoInt: 888,
        pdfA4: null,
      },
      normal: {
        logMessage: `${username}-${fileName} creado y de tipo NORMAL(Segun configuracion del establecimiento = NO envia ha SUNAT)`,
        codigo: 'VALID_NO_SENT',
        codigoInt: 999,
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
    const totales = this.obtenerTotalesInvoices(invoiceEntity.invoices_details);

    return {
      invoice: invoiceEntity,
      fileName: fileName,
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
  ) {
    if (!manager) {
      throw new Error('Este método debe ejecutarse dentro de una transacción');
    }

    try {
      //Validamos la existencia de los tipos de productos, unidad, etc...
      const details = await this.validarYFormatearDetalle(
        invoice.details,
        decimales,
      );

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.obtenerTotalesInvoices(details);

      //Seteamos nuestro obj invoice con sus productos y totales
      const newInvoice: InvoiceEntity = {
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
      const details = await this.validarYFormatearDetalle(
        newDataInvoice.details,
        decimales,
      );

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.obtenerTotalesInvoices(details);

      // Modificamos lo necesario
      this.invoiceRepository.merge(invoiceExisting, {
        ...newDataInvoice,
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

  private async validarYFormatearDetalle(
    input: InvoiceEntity | any[],
    decimales: number,
  ): Promise<InvoiceDetailsEntity[]> {
    const formatearDetalle = async (
      detail: any,
    ): Promise<InvoiceDetailsEntity> => {
      // Validamos la existencia de los tipos de productos, unidad, etc.
      const unidad = await this.unidadService.findUnidadByCodigo(detail.unidad);
      const tipAfeIgv = await this.tipoIgvService.findTipIgvByCodigo(
        detail.tipAfeIgv,
      );

      const porcentaje = detail.porcentajeIgv;

      // Validación de porcentaje permitido
      if (!PORCENTAJES_IGV_DISPONIBLES.includes(porcentaje)) {
        throw new HttpException(
          'El porcentaje de IGV no es válido',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Gravada onerosa y gravadas gratuitas solo reciben 18%
      if (
        porcentaje !== PORCENTAJE_IGV_GRAVADA &&
        (tipAfeIgv.codigo === CODIGO_GRAVADA_ONEROSA ||
          CODIGOS_GRAVADAS_GRATUITAS.includes(tipAfeIgv.codigo))
      ) {
        throw new HttpException(
          'El porcentaje de IGV no es válido para el tipo de afectación',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Exonerada, inafecta, exportación e inafectas gratuitas solo reciben 0%
      if (
        porcentaje !== PORCENTAJE_IGV_GRATUITA &&
        (tipAfeIgv.codigo === CODIGO_EXONERADA_ONEROSA ||
          tipAfeIgv.codigo === CODIGO_INAFECTA_ONEROSA ||
          tipAfeIgv.codigo === CODIGO_EXPORTACION ||
          CODIGOS_INAFECTAS_GRATUITAS.includes(tipAfeIgv.codigo))
      ) {
        throw new HttpException(
          'El porcentaje de IGV no es válido para el tipo de afectación',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        id: detail.id,
        unidad,
        tipAfeIgv,
        codigo: detail.codigo,
        cantidad: detail.cantidad,
        descripcion: detail.descripcion,
        mtoValorUnitario: round(detail.mtoValorUnitario, decimales),
        porcentajeIgv: porcentaje,
      };
    };

    // Determinamos si es un array de detalles o una factura completa
    const detalles: any[] = Array.isArray(input)
      ? input // Caso: entrada DTO antes de la cabecera
      : input.invoices_details.map((detail) => ({
          ...detail,
          unidad: detail.unidad.codigo,
          tipAfeIgv: detail.tipAfeIgv.codigo,
        })); // Caso: factura completa

    // Procesamos todos los detalles
    const detallesFormateados = await Promise.all(
      detalles.map((d) => formatearDetalle(d)),
    );

    return detallesFormateados;
  }

  async procesarEnvioSunat(
    invoiceEntity: InvoiceEntity,
    invoiceFormated: QueryInvoiceList,
    fileName: string,
    xmlSigned: string,
    xmlUnsigned: string,
  ): Promise<QueryResultInvoice> {
    const empresa = invoiceEntity.empresa;
    const establecimiento = invoiceEntity.establecimiento;
    const usuario = invoiceEntity.usuario;
    let codigo_respuesta_sunat: string | null = null;
    let codigo_respuesta_sunat_int: number | null = null;

    this.logger.log(
      `${usuario.username}: ${fileName} se inicia proceso de envio a SUNAT`,
    );

    try {
      //Cambiamos el estado de creado a enviando a sunat
      await this.invoiceRepository.update(
        { id: invoiceEntity.id },
        { estado_operacion: 1 },
      );

      //Notificamos al cliente que estamos enviando a sunat
      this.invoiceGateway.server
        .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
        .emit('server::newInvoice', {
          ...invoiceFormated,
          estado_operacion: 1,
        });

      //Enviamos a sunat
      const sunat = await this.enviarSunat(invoiceEntity, fileName, xmlSigned);

      const {
        sunat_code_int,
        sunat_code,
        mensaje_sunat,
        observaciones_sunat,
        cdrZip,
      } = sunat;

      codigo_respuesta_sunat = sunat_code;
      codigo_respuesta_sunat_int = sunat_code_int;

      const observaciones_sunat_modified =
        observaciones_sunat && observaciones_sunat.length > 0
          ? observaciones_sunat.join('|')
          : null;

      if (codigo_respuesta_sunat === 'HTTP') {
        await this.invoiceRepository.update(
          { id: invoiceEntity.id },
          {
            estado_operacion: 1,
            respuesta_sunat_codigo: codigo_respuesta_sunat,
            respuesta_sunat_descripcion: mensaje_sunat,
            observaciones_sunat: observaciones_sunat_modified,
          },
        );

        invoiceFormated = await this.formatListInvoices(
          {
            ...invoiceEntity,
            estado_operacion: 1,
            respuesta_sunat_codigo: codigo_respuesta_sunat,
            respuesta_sunat_descripcion: mensaje_sunat,
            observaciones_sunat: observaciones_sunat_modified,
          },
          fileName,
        );

        this.logger.warn(`${usuario.username}: warning-${mensaje_sunat}.`);
      } else {
        // ACEPTADA
        if (sunat_code_int === 0) {
          //Cambiamos el estado de enviado a aceptado
          await this.invoiceRepository.update(
            { id: invoiceEntity.id },
            {
              estado_operacion: 2,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
          );

          invoiceFormated = await this.formatListInvoices(
            {
              ...invoiceEntity,
              estado_operacion: 2,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            fileName,
          );

          //Notificamos al server que se acepto a sunat
          this.logger.log(`${usuario.username}: ${mensaje_sunat}`);

          //Notificamos a los clientes que se acepto a sunat
          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.success',
              correlativo: invoiceEntity.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `${mensaje_sunat}`,
            });

          //Notificamos al cliente que se acepto a sunat
          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::newInvoice', invoiceFormated);
        }
        // RECHAZADA
        else if (sunat_code_int >= 2000 && sunat_code_int <= 3999) {
          //Cambiamos el estado de enviado a rechazado
          await this.invoiceRepository.update(
            { id: invoiceEntity.id },
            {
              estado_operacion: 3,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
          );

          invoiceFormated = await this.formatListInvoices(
            {
              ...invoiceEntity,
              estado_operacion: 3,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            fileName,
          );

          //Notificamos a los clientes que sunat rechazo el cpe
          this.logger.error(
            `${usuario.username}:${fileName} fue rechazado por SUNAT - ${sunat_code_int}:${mensaje_sunat}.`,
          );

          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.failed',
              correlativo: invoiceEntity.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `${fileName} fue rechazado por SUNAT - ${sunat_code_int}:${mensaje_sunat}.`,
            });

          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::newInvoice', invoiceFormated);
        }
        //EXCEPCION(error contribuyente)
        else if (sunat_code_int >= 1000 && sunat_code_int <= 1999) {
          await this.invoiceRepository.update(
            { id: invoiceEntity.id },
            {
              estado_operacion: 4,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
          );

          invoiceFormated = await this.formatListInvoices(
            {
              ...invoiceEntity,
              estado_operacion: 4,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            fileName,
          );

          //Notificamos a los clientes que sunat rechazo el cpe
          this.logger.warn(
            `${usuario.username}:${fileName} excepcion por SUNAT - ${sunat_code_int}:${mensaje_sunat}.`,
          );

          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.failed',
              correlativo: invoiceEntity.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `${fileName} excepcion por SUNAT - ${sunat_code_int}:${mensaje_sunat}.`,
            });

          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::newInvoice', invoiceFormated);
        }
        //EXCEPCION 0100 al 999 corregir y volver a enviar cpe
        else {
          await this.invoiceRepository.update(
            { id: invoiceEntity.id },
            {
              estado_operacion: 1,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
          );

          invoiceFormated = await this.formatListInvoices(
            {
              ...invoiceEntity,
              estado_operacion: 1,
              respuesta_sunat_codigo: codigo_respuesta_sunat,
              respuesta_sunat_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            fileName,
          );

          this.logger.warn(`${usuario.username}: warning-${mensaje_sunat}.`);
        }
      }

      //Guardamos archivos excepto si es excepcion-contribuyente
      if (!(sunat_code_int >= 1000 && sunat_code_int <= 1999)) {
        if (!xmlUnsigned) {
          throw new HttpException(
            `El archivo xmlUnsigned es null para ${fileName}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!xmlSigned) {
          throw new HttpException(
            `El archivo xmlSigned es null para ${fileName}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        //Guardamos el XML en el directorio del cliente
        await guardarArchivo(
          `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}/XML`,
          `${fileName}.xml`,
          xmlUnsigned,
          true,
        );

        //Guardamos el XML Firmado en el directorio del cliente
        await guardarArchivo(
          `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}/FIRMA`,
          `${fileName}.xml`,
          xmlSigned,
          true,
        );

        if (cdrZip) {
          //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
          const CdrZipBuffer = Buffer.from(cdrZip, 'base64');

          //Guardamos el CDR en el servidor en el directorio del cliente
          await guardarArchivo(
            `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}/RPTA`,
            `R-${fileName}.zip`,
            CdrZipBuffer,
            true,
          );
        }

        //Creamos el pdf formato A4
        const pdf = await getPdf(docDefinitionA4);

        //Guardamos el PDF en el servidor en el directorio del cliente
        await guardarArchivo(
          `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}/PDF`,
          `${fileName}.pdf`,
          pdf,
          true,
        );
      }

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.obtenerTotalesInvoices(
        invoiceEntity.invoices_details,
      );

      this.logger.log(
        `${usuario.username}: ${fileName} finalizó el proceso de envio a SUNAT`,
      );

      return {
        invoice: invoiceEntity,
        fileName: fileName,
        codigo_respuesta_sunat: codigo_respuesta_sunat,
        codigo_respuesta_sunat_int: codigo_respuesta_sunat_int,
        documento: `${invoiceEntity.tipo_doc.tipo_documento.toUpperCase()} ELECTRÓNICA`,
        serie: invoiceEntity.serie,
        correlativo: String(
          Number(quitarCerosIzquierda(invoiceEntity.correlativo)) + 1,
        ),
        correlativo_registrado: invoiceEntity.correlativo,
        total: `${invoiceEntity.tipo_moneda.simbolo} ${totales.mtoOperGravadas}`,
        xml: invoiceFormated.xml,
        cdr: invoiceFormated.cdr,
        pdfA4: invoiceFormated.pdfA4,
      };
    } catch (e) {
      throw new HttpException(
        `Error al enviar a SUNAT: ${e.message}`,
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

  async validarCertificado(empresa: EmpresaEntity) {
    // Ruta certificado .pem
    const pemFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/${
        empresa.modo === 0
          ? 'prueba/certificado_beta.pem'
          : `produccion/${empresa.ruc}/${empresa.fieldname_cert}`
      }`,
    );

    try {
      // Validamos que el archivo .pem existe usando fs/promises
      await fs.promises.access(pemFilePath, fs.constants.F_OK);

      return pemFilePath;
    } catch (error) {
      throw new HttpException(
        `Certificado .pem no encontrado: ${pemFilePath}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validXsdUblInvoice2_1(
    xmlBuffer: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const url = `http://localhost:8088/api/xsd/validate/UBL-Invoice-2.1`;

    try {
      const response = await axios.post<{
        isValid: boolean;
        errors: string[];
      }>(url, xmlBuffer, {
        headers: {
          'Content-Type': 'application/xml',
        },
      });

      return response.data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        return {
          isValid: false,
          errors: ['Servicio xml-sunat-validator no disponible'],
        };
      }

      const error = e.response?.data?.message || e.message;
      return {
        isValid: false,
        errors: [`Error al validar el XSL: ${error || 'Internal'}`],
      };
    }
  }

  async validXslExprRegFactura2_0_1(
    xmlBuffer: string,
    xmlName: string,
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const url = `http://localhost:8088/api/xslt/transform/ValidaExprRegFactura/${xmlName}`;

    try {
      const response = await axios.post<{
        isValid: boolean;
        errors: string[];
      }>(url, xmlBuffer, {
        headers: {
          'Content-Type': 'application/xml',
        },
      });

      return response.data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        return {
          isValid: false,
          errors: ['Servicio xml-sunat-validator no disponible'],
        };
      }

      const error = e.response?.data?.message || e.message;
      return {
        isValid: false,
        errors: [`Error al validar el XSL: ${error || 'Internal'}`],
      };
    }
  }

  private async generarXML(
    invoice: InvoiceEntity,
    decimales = 6,
  ): Promise<{
    xmlUnsigned: string;
    fileName: string;
    fileNameExtension: string;
  }> {
    //Validamos la existencia de los tipos de productos, unidad, etc...
    const details = await this.validarYFormatearDetalle(invoice, decimales);

    //Calculamos los totales del invoice y obtendran solo 2 decimales
    const totales = this.obtenerTotalesInvoices(details);

    //Si el producto tiene id validamos producto

    //Validamos si el producto pertenece a la empresa

    //Validamos si el producto pertenece al establecimiento

    //Validamos si el producto tiene stock
    const dataApi = {
      cliente: {
        tipo_documento:
          invoice.cliente?.tipo_entidad?.codigo ?? invoice.entidad_tipo, //ruc es 6
        numero_documento:
          invoice.cliente?.numero_documento ?? invoice.entidad_documento, //ruc cliente
        razon_social: invoice.cliente?.entidad ?? invoice.entidad,
        direccion: invoice.cliente?.direccion ?? invoice.entidad_direccion,
      },
      empresa: {
        ruc: invoice.empresa.ruc,
        razon_social: invoice.empresa.razon_social,
        nombre_comercial: invoice.empresa.nombre_comercial,
      },
      establecimiento: {
        ubigeo: invoice.establecimiento.ubigeo,
        departamento: invoice.establecimiento.departamento,
        provincia: invoice.establecimiento.provincia,
        distrito: invoice.establecimiento.distrito,
        direccion: invoice.establecimiento.direccion,
        urbanizacion: '-',
        codLocal: invoice.establecimiento.codigo,
      },
      serie: invoice.serie,
      numero: invoice.correlativo,
      tipo_operacion: invoice.tipo_operacion,
      fecha_emision: invoice.fecha_emision,
      tipo_documento: invoice.tipo_doc.codigo, //para facturas 01
      forma_pago: invoice.forma_pago.forma_pago, //1 = Contado; 2 = Credito
      moneda: invoice.tipo_moneda.abrstandar, //PEN
      productos: invoice.invoices_details.reduce((acc, producto) => {
        //onerosas y exportacion
        const ONEROSAS_EXPORTACION = [
          CODIGO_GRAVADA_ONEROSA,
          CODIGO_EXONERADA_ONEROSA,
          CODIGO_INAFECTA_ONEROSA,
          CODIGO_EXPORTACION,
        ];
        if (ONEROSAS_EXPORTACION.includes(producto.tipAfeIgv.codigo)) {
          const mtoValorUnitario = round(producto.mtoValorUnitario);
          const mtoValorVenta = mtoValorUnitario * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //onerosa = 18; exonerada = 0; inafecta = 0; exportacion = 0
          const igvUnitario = (mtoValorUnitario * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;
          const mtoPrecioUnitario = mtoValorUnitario + igvUnitario;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.descripcion,
            cantidad: producto.cantidad,
            mtoValorUnitario: mtoValorUnitario, //3decimales
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: round(mtoPrecioUnitario),
          };

          acc.push(objProduct);
        }

        //11,12,13,14,15,16,17,21,31,32,33,34,35,36,37
        const CODIGOS_GRAVADAS_INAFECTAS_GRATUITAS = [
          ...CODIGOS_GRAVADAS_GRATUITAS,
          ...CODIGOS_INAFECTAS_GRATUITAS,
        ];

        if (
          CODIGOS_GRAVADAS_INAFECTAS_GRATUITAS.includes(
            producto.tipAfeIgv.codigo,
          )
        ) {
          const mtoValorGratuito = round(producto.mtoValorUnitario);
          const mtoValorVenta = mtoValorGratuito * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //grabavos gratuitos = 18; inafecta gratuitos = 0
          const igvUnitario = (mtoValorGratuito * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.descripcion,
            cantidad: producto.cantidad,
            mtoValorUnitario: 0,
            mtoValorGratuito: mtoValorGratuito,
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: 0,
          };

          acc.push(objProduct);
        }

        return acc;
      }, []),
      MtoOperGravadas: invoice.mto_operaciones_gravadas,
      MtoIGV: invoice.mto_igv,
      TotalImpuestos: totales.totalImpuestos,
      ValorVenta: totales.valorVenta,
      SubTotal: totales.subTotal,
      MtoImpVenta: totales.mtoImpVenta,
      LegendValue: numeroALetras(totales.mtoImpVenta),
      LegendCode: 1000, // Monto en letras - Catalog. 52
      MtoOperExoneradas: invoice.mto_operaciones_exoneradas,
      MtoOperInafectas: invoice.mto_operaciones_inafectas,
      MtoOperExportacion: invoice.mto_operaciones_exportacion,
      MtoOperGratuitas: invoice.mto_operaciones_gratuitas,
      MtoIGVGratuitas: invoice.mto_igv_gratuitas,
      observaciones: invoice.observaciones_invoice
        ? invoice.observaciones_invoice.split('|')
        : [],
      fecha_vencimiento: invoice.fecha_vencimiento,
    };

    //opcionales

    //Solo enviaremos los datos necesarios a la api generar xml
    if (
      invoice.mto_operaciones_gravadas === null ||
      invoice.mto_operaciones_gravadas === 0
    ) {
      delete dataApi.MtoOperGravadas;
    }

    if (
      invoice.mto_operaciones_exoneradas === null ||
      invoice.mto_operaciones_exoneradas === 0
    ) {
      delete dataApi.MtoOperExoneradas;
    }

    if (
      invoice.mto_operaciones_inafectas === null ||
      invoice.mto_operaciones_inafectas === 0
    ) {
      delete dataApi.MtoOperInafectas;
    }

    if (
      invoice.mto_operaciones_exportacion === null ||
      invoice.mto_operaciones_exportacion === 0
    ) {
      delete dataApi.MtoOperExportacion;
    }

    if (
      invoice.mto_operaciones_gratuitas === null ||
      invoice.mto_operaciones_gratuitas === 0
    ) {
      delete dataApi.MtoOperGratuitas;
    }

    if (invoice.mto_igv_gratuitas === null || invoice.mto_igv_gratuitas === 0) {
      delete dataApi.MtoIGVGratuitas;
    }

    if (invoice.mto_igv === null || invoice.mto_igv === 0) {
      delete dataApi.MtoIGV;
    }

    //fin opcionales
    try {
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-xml`,
        dataApi,
      );

      const { xml: xmlUnsigned, fileName, fileNameExtension } = res.data;

      return {
        xmlUnsigned,
        fileName,
        fileNameExtension,
      };
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter posiblemente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        `Error de comunicación con el servicio: sunat.generarXML ${
          e.response?.data?.message ?? 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async firmarXML(
    xmlUnsigned: string,
    certificado: string,
  ): Promise<string> {
    try {
      const res = await axios.post<string>(
        `${process.env.API_SERVICE_PHP}/sign`,
        {
          xml: xmlUnsigned,
          certificado,
        },
      );

      return res.data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        `Error de comunicación con el servicio: sunat.firmar - ${
          e.response?.data?.message ?? 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async validateXSDandXSL(xmlSigned: string, fileNameExtension: string) {
    try {
      // Validación de Esquema (XSD)
      const resultXSD = await this.validXsdUblInvoice2_1(xmlSigned);
      if (!resultXSD.isValid) {
        throw new HttpException(
          JSON.stringify(resultXSD.errors, null, 2),
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validación de contenido (XSL) tempXmlPath
      const resultXSL = await this.validXslExprRegFactura2_0_1(
        xmlSigned,
        fileNameExtension,
      );

      if (!resultXSL.isValid) {
        throw new HttpException(
          JSON.stringify(resultXSL.errors, null, 2),
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (e) {
      throw new HttpException(
        `Error en InvoiceService.validateXSDandXSL - ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateInvoiceDocument(invoice: InvoiceEntity) {
    const username = invoice.usuario.username;
    const enviroment = invoice.empresa.modo === 0 ? 'BETA' : 'PRODUCCION';
    const empresa = invoice.empresa;
    try {
      // 1.- Generamos XML
      this.logger.debug(`${username}: generando XML...`);
      const xmlGenerado = await this.generarXML(invoice);
      const { fileName, xmlUnsigned, fileNameExtension } = xmlGenerado;
      this.logger.debug(`${username}: ${fileName} XML generado!`);

      // 2.- Validamos exsistencia de certificado digital
      this.logger.debug(
        `${username}: ${fileName} validando existencia de certificado digital en ${enviroment}...`,
      );
      const certificado = await this.validarCertificado(empresa);
      this.logger.debug(
        `${username}: ${fileName} certificado digital validado!`,
      );

      // 3.- Firmamos XML
      this.logger.debug(`${username}: ${fileName} firmando XML...`);
      const xmlSigned = await this.firmarXML(xmlUnsigned, certificado);
      this.logger.debug(`${username}: ${fileName} XML firmado!`);

      // 4.- Validamos XSD y XSL del XML firmado
      this.logger.debug(`${username}: ${fileName} validando XSD y XSL...`);
      await this.validateXSDandXSL(xmlSigned, fileNameExtension);
      this.logger.debug(`${username}: ${fileName} XSD y XSL validados!`);

      return {
        fileName,
        xmlSigned,
        xmlUnsigned,
      };
    } catch (e) {
      throw new HttpException(
        `Error en InvoiceService.validateInvoiceDocument - ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async enviarSunat(
    invoice: InvoiceEntity,
    fileName: string,
    xmlSigned: string,
  ): Promise<QuerySunat> {
    const urlService = invoice.empresa.web_service;
    const isOSE = invoice.empresa.ose_enabled;
    const userSecuOSE = invoice.empresa.usu_secundario_ose_user;
    const passSecuOSE = invoice.empresa.usu_secundario_ose_password;
    const userSecuSUNAT = invoice.empresa.usu_secundario_user;
    const passSecuSUNAT = invoice.empresa.usu_secundario_password;
    const usuario = isOSE ? userSecuOSE : userSecuSUNAT;
    const contrasenia = isOSE ? passSecuOSE : passSecuSUNAT;

    try {
      const { data } = await axios.post<QuerySunat>(
        `${process.env.API_SERVICE_PHP}/sendSunat`,
        {
          urlService,
          usuario,
          contrasenia,
          fileName,
          contentFile: xmlSigned,
        },
      );

      return data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        `Error en InvoiceService.enviarSolicitudSunat - ${e.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async consultarCDR(
    usuario: string,
    contrasenia: string,
    ruc: string,
    tipoDoc: string,
    serie: string,
    correlativo: string,
  ) {
    try {
      return await axios.post(`${process.env.API_SERVICE_PHP}/consult-cdr`, {
        usuario,
        contrasenia,
        ruc,
        tipoDoc,
        serie,
        correlativo,
      });
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const message = `[${e.response.data.error?.code}]:${e.response.data.error?.message}`;
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.consultarCDR - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  //para facturas
  async comunicarBaja(
    invoice: InvoiceEntity,
    motivo: string,
    correlativoBaja: string,
  ) {
    const certificado = await this.validarCertificado(invoice.empresa);

    const dataXML = {
      empresa: {
        ruc: invoice.empresa.ruc,
        razon_social: invoice.empresa.razon_social,
        nombre_comercial: invoice.empresa.nombre_comercial,
      },
      establecimiento: {
        ubigeo: invoice.establecimiento.ubigeo,
        departamento: invoice.establecimiento.departamento,
        provincia: invoice.establecimiento.provincia,
        distrito: invoice.establecimiento.distrito,
        direccion: invoice.establecimiento.direccion,
        urbanizacion: '-',
        codLocal: invoice.establecimiento.codigo,
      },
      tipo_documento: invoice.tipo_doc.codigo,
      serie: invoice.serie,
      correlativo: invoice.correlativo,
      fecha_emision: invoice.fecha_emision,
      fecha_comunicacion: new Date(),
      motivo,
      correlativoBaja,
    };

    try {
      //GENERAMOS XML
      const xmlBaja = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-xml-baja`,
        dataXML,
      );

      const { fileName, fileNameExtension, xml: xmlBuffer } = xmlBaja.data;

      //GUARDAMOS XML
      await guardarArchivo(
        `uploads/files/${invoice.empresa.ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/XML`,
        `${fileNameExtension}`,
        xmlBuffer,
        true,
      );

      //FIRMAMOS XML
      const xmlSigned = await this.firmarXML(xmlBuffer, certificado);

      //GUARDAMOS XML FIRMADO
      await guardarArchivo(
        `uploads/files/${invoice.empresa.ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/FIRMA`,
        `${fileNameExtension}`,
        xmlSigned,
        true,
      );

      //PREPARAMOS OBJ PARA IDENTIFICARNOS Y GENERAR TICKET
      const dataIdentify = {
        urlService: invoice.empresa.web_service,
        usuario: invoice.empresa.ose_enabled
          ? invoice.empresa.usu_secundario_ose_user
          : invoice.empresa.usu_secundario_user,
        contrasenia: invoice.empresa.ose_enabled
          ? invoice.empresa.usu_secundario_ose_password
          : invoice.empresa.usu_secundario_password,
        fileName: fileName,
        contentFile: xmlSigned,
      };

      //GENERAMOS TICKET DE SUNAT
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-ticket-baja`,
        dataIdentify,
      );

      return {
        numero: res.data.ticket,
        fileName: fileName,
        fecha_comunicacion: dataXML.fecha_comunicacion,
      };
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const message = `[${e.response.data.error?.code}]:${e.response.data.error?.message}`;
      throw new HttpException(
        `Error al comunicar la baja InvoiceService.comunicarBaja - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async enviarSunatTicket(invoice: InvoiceEntity, ticket: string) {
    const dataIdentify = {
      urlService: invoice.empresa.web_service,
      usuario: invoice.empresa.ose_enabled
        ? invoice.empresa.usu_secundario_ose_user
        : invoice.empresa.usu_secundario_user,
      contrasenia: invoice.empresa.ose_enabled
        ? invoice.empresa.usu_secundario_ose_password
        : invoice.empresa.usu_secundario_password,
      ticket: ticket,
    };

    try {
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/sendSunatBaja`,
        dataIdentify,
      );
      return res.data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const message = `[${e.response.data.error.code}]:${e.response.data.error.message}`;
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.enviarSunatTicket - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async findOneInvoiceById(idInvoice: number) {
    let invoice: InvoiceEntity = null;

    try {
      invoice = await this.invoiceRepository.findOne({
        relations: {
          tipo_moneda: true,
          forma_pago: true,
          tipo_doc: true,
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
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
  ) {
    try {
      return await this.invoiceRepository.find({
        relations: {
          tipo_doc: true,
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
          invoices_details: {
            tipAfeIgv: true,
            unidad: true,
          },
        },
        where: {
          empresa: {
            id: Equal(idEmpresa),
          },
          establecimiento: {
            id: Equal(idEstablecimiento),
          },
          estado_operacion: Equal(operacion),
        },
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

  obtenerHashXMLFirmado(xmlSigned: any) {
    const startTag = '<ds:DigestValue>';
    const endTag = '</ds:DigestValue>';
    const startIndex = xmlSigned.indexOf(startTag);
    const endIndex = xmlSigned.indexOf(endTag);
    let hash = '';
    if (startIndex !== -1 && endIndex !== -1) {
      const nodoContent = xmlSigned.substring(
        startIndex + startTag.length,
        endIndex,
      );

      hash = nodoContent;
    }

    return hash;
  }

  private obtenerTotalesInvoices(
    productos: InvoiceDetailsEntity[],
  ): QueryTotales {
    const operaciones = productos.reduce(
      (acc, producto) => {
        //gravadas
        if (producto.tipAfeIgv.codigo === '10') {
          const igv = round(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeGravadas = round(
            producto.mtoValorUnitario * producto.cantidad,
          );

          acc.mtoIGVGravadas += igv;
          acc.mtoOperGravadas += opeGravadas;
        }

        //exonegaradas
        if (producto.tipAfeIgv.codigo === '20') {
          const igv = round(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeExoneradas = round(
            producto.mtoValorUnitario * producto.cantidad,
          );

          acc.mtoOperExoneradas += opeExoneradas;
          acc.mtoIGVExoneradas += igv;
        }

        //inafectas
        if (producto.tipAfeIgv.codigo === '30') {
          const igv = round(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeInafectas = round(
            producto.mtoValorUnitario * producto.cantidad,
          );

          acc.mtoOperInafectas += opeInafectas;
          acc.mtoIGVInafectas += igv;
        }

        //exportacion
        if (producto.tipAfeIgv.codigo === '40') {
          const igv = round(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeExportacion = round(
            producto.mtoValorUnitario * producto.cantidad,
          );

          acc.mtoOperExportacion += opeExportacion;
          acc.mtoIGVExportacion += igv;
        }

        //gratuitas
        if (
          producto.tipAfeIgv.codigo === '11' ||
          producto.tipAfeIgv.codigo === '12' ||
          producto.tipAfeIgv.codigo === '13' ||
          producto.tipAfeIgv.codigo === '14' ||
          producto.tipAfeIgv.codigo === '15' ||
          producto.tipAfeIgv.codigo === '16' ||
          producto.tipAfeIgv.codigo === '17' ||
          producto.tipAfeIgv.codigo === '21' ||
          producto.tipAfeIgv.codigo === '31' ||
          producto.tipAfeIgv.codigo === '32' ||
          producto.tipAfeIgv.codigo === '33' ||
          producto.tipAfeIgv.codigo === '34' ||
          producto.tipAfeIgv.codigo === '35' ||
          producto.tipAfeIgv.codigo === '36' ||
          producto.tipAfeIgv.codigo === '37'
        ) {
          const igv = round(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeGratuitas = round(
            producto.mtoValorUnitario * producto.cantidad,
          );

          acc.mtoOperGratuitas += opeGratuitas;
          acc.mtoIGVGratuitas += igv;
        }

        acc.mtoIGV =
          acc.mtoIGVGravadas +
          acc.mtoIGVExoneradas +
          acc.mtoIGVInafectas +
          acc.mtoIGVExportacion;

        acc.totalImpuestos =
          acc.mtoIGVGravadas +
          acc.mtoIGVExoneradas +
          acc.mtoIGVInafectas +
          acc.mtoIGVExportacion; //IGV + ISC + OTH

        acc.valorVenta =
          acc.mtoOperGravadas +
          acc.mtoOperExoneradas +
          acc.mtoOperInafectas +
          acc.mtoOperExportacion;

        acc.subTotal = round(acc.valorVenta + acc.totalImpuestos);

        acc.mtoImpVenta = acc.subTotal;

        return acc;
      },
      {
        mtoOperGravadas: 0.0,
        mtoOperExoneradas: 0.0,
        mtoOperInafectas: 0.0,
        mtoOperExportacion: 0.0,
        mtoOperGratuitas: 0.0,
        mtoIGV: 0.0,
        totalImpuestos: 0.0,
        valorVenta: 0.0,
        subTotal: 0.0,
        mtoImpVenta: 0.0,
        mtoIGVGravadas: 0.0,
        mtoIGVExoneradas: 0.0,
        mtoIGVInafectas: 0.0,
        mtoIGVExportacion: 0.0,
        mtoIGVGratuitas: 0.0,
      },
    );

    const mapOperaciones = {
      mtoOperGravadas: operaciones.mtoOperGravadas,
      mtoOperExoneradas: operaciones.mtoOperExoneradas,
      mtoOperInafectas: operaciones.mtoOperInafectas,
      mtoOperExportacion: operaciones.mtoOperExportacion,
      mtoOperGratuitas: operaciones.mtoOperGratuitas,
      mtoIGV: operaciones.mtoIGV,
      totalImpuestos: operaciones.totalImpuestos,
      valorVenta: operaciones.valorVenta,
      subTotal: operaciones.subTotal,
      mtoImpVenta: operaciones.mtoImpVenta,
      mtoIGVGratuitas: operaciones.mtoIGVGratuitas,
    };

    if (mapOperaciones.mtoOperGravadas === 0) {
      mapOperaciones.mtoOperGravadas = null;
    }

    if (mapOperaciones.mtoOperExoneradas === 0) {
      mapOperaciones.mtoOperExoneradas = null;
    }

    if (mapOperaciones.mtoOperInafectas === 0) {
      mapOperaciones.mtoOperInafectas = null;
    }

    if (mapOperaciones.mtoOperExportacion === 0) {
      mapOperaciones.mtoOperExportacion = null;
    }

    if (mapOperaciones.mtoOperGratuitas === 0) {
      mapOperaciones.mtoOperGratuitas = null;
    }

    if (mapOperaciones.mtoIGVGratuitas === 0) {
      mapOperaciones.mtoIGVGratuitas = null;
    }

    if (mapOperaciones.mtoIGV === 0) {
      mapOperaciones.mtoIGV = null;
    }

    return mapOperaciones;
  }

  async formatListInvoices(
    invoice: InvoiceEntity,
    fileName: string,
  ): Promise<QueryInvoiceList> {
    try {
      const urlStatic = await this.configService.get<string>(
        'URL_FILES_STATIC',
      );
      const { ruc } = invoice.empresa;
      const { codigo: tipoDoc, tipo_documento: nomDoc } = invoice.tipo_doc;
      const establecimiento = `${invoice.establecimiento.codigo}`;

      let rutaFirma = '';
      let rutaCDR = '';

      //null(no enviado), 1(enviado con ticket), 2(anulacion aceptado), 3(anulacion rechazada)
      if (invoice.estado_anulacion === 2) {
        rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/BAJA/FIRMA/${fileName}.xml`;
        rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/BAJA/RPTA/R-${fileName}.zip`;
      }
      //0(creado), 1(enviando), 2(aceptado), 3(rechazado)
      else if ([0, 2, 3].includes(invoice.estado_operacion)) {
        rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`;
        rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`;
      }

      const pathDirFirma = path.join(
        process.cwd(),
        `uploads/files/${rutaFirma}`,
      );
      const pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

      const pathStaticFirma = `${urlStatic}/${rutaFirma}`;
      const pathStaticCDR = `${urlStatic}/${rutaCDR}`;

      const [firmaExists, cdrExists] = await Promise.all([
        fileExists(pathDirFirma),
        fileExists(pathDirCDR),
      ]);

      const result: QueryInvoiceList = {
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
        cliente: invoice.cliente ? invoice.cliente.entidad : invoice.entidad,
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
        usuario: `${invoice.usuario.nombres} ${invoice.usuario.apellidos}`,
        moneda_abrstandar: invoice.tipo_moneda.abrstandar,
        moneda_simbolo: invoice.tipo_moneda.simbolo,
        fecha_registro: invoice.createdAt,
        fecha_emision: invoice.fecha_emision,
        forma_pago: invoice.forma_pago.forma_pago,
        cdr: cdrExists ? pathStaticCDR : '#',
        xml: firmaExists ? pathStaticFirma : '#',
        pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/test.pdf`,
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

      return result;
    } catch (error) {
      throw new HttpException(
        'Error al formatear comprobante',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
