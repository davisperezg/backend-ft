import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Equal, Repository } from 'typeorm';
import { NotaVentaDetailEntity } from '../entities/nota-venta-detail.entity';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { NotaVentaEntity } from '../entities/nota-venta.entity';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { PosService } from 'src/pos/services/pos.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { MonedasService } from 'src/monedas/services/monedas.service';
import { TipoEntidadService } from 'src/tipo-entidades/services/tipo-entidades.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { ClientePermission } from 'src/lib/enum/cliente.enum';
import { NotaVentaInput } from '../inputs/nota-venta.input';
import { PosEntity } from 'src/pos/entities/pos.entity';
import {
  completarConCeros,
  formatListInvoices,
  formatListNotaVentas,
  getPdf,
  guardarArchivo,
  round,
} from 'src/lib/functions';
import Redis from 'ioredis';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { InvoiceSocketService } from 'src/socket-session/services/invoice-socket.service';
import { NotaVentaSocketService } from 'src/socket-session/services/notaVenta-socket.service';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { MonedaEntity } from 'src/monedas/entities/monedas.entity';
import { SunatService } from 'src/sunat/services/sunat.service';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';
import { NotaVentaGateway } from 'src/gateway/nota_venta.gateway';
import dayjs from 'dayjs';
import { CreatedNotaVentaDto } from '../dto/created-nota-venta.dto';
import { ListNotaVentaDto } from '../dto/list-nota-venta.dto';
import {
  crearDocTicket,
  DatosTicket,
  docDefinition58mm,
  docDefinition80mm,
  docDefinitionA4,
} from 'src/lib/const/pdf';

@Injectable()
export class NotaVentaService {
  private logger = new Logger('NotaVentaService');

  constructor(
    @InjectRepository(NotaVentaEntity)
    private notaVentaRepository: Repository<NotaVentaEntity>,
    private readonly empresaService: EmpresaService,
    private readonly establecimientoService: EstablecimientoService,
    private readonly posService: PosService,
    private readonly tipoDocumentoService: TipodocsService,
    private readonly monedaService: MonedasService,
    private readonly tipoEntidadService: TipoEntidadService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(EntidadEntity)
    private clienteRepository: Repository<EntidadEntity>,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    @InjectRepository(SeriesEntity)
    private serieRepository: Repository<SeriesEntity>,
    private readonly notaVentaSocketService: NotaVentaSocketService,
    private readonly sunatService: SunatService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotaVentaGateway))
    private readonly notaVentaGateway: NotaVentaGateway,
  ) {}

  async createNotaVenta(
    notaVenta: NotaVentaInput,
    user: QueryToken,
    socketId?: string,
  ): Promise<CreatedNotaVentaDto> {
    const validationResult = await this.validateNotaVentaData(notaVenta, user);
    const {
      empresa,
      establecimiento,
      pos,
      tipoDocumento,
      tipoMoneda,
      hasPermissionToCreateClient,
      usuario,
      clienteEntity,
    } = validationResult;

    const DECIMAL = 6;

    // 2. Verificar si el notaVenta ya existe (fuera de la transacción)
    const existNotaVenta = await this.findOneNotaVentaById(notaVenta.id);

    // Generate room identifier for notifications
    const roomId = `room_notasventas_emp-${empresa.id}_est-${establecimiento.id}`;

    // 4. Iniciar una única transacción para todo el proceso
    let correlativoResult: { correlativo: string; oldCorrelativo: string } = {
      correlativo: null,
      oldCorrelativo: null,
    };

    let notaVentaEntity: NotaVentaEntity | null = null;
    const validation: {
      fileName: string;
    } = {
      fileName: null,
    };

    try {
      // Obtener correlativo si es necesario (fuera de la transacción para reducir tiempo de bloqueo)
      if (
        !existNotaVenta ||
        (existNotaVenta && existNotaVenta.serie !== notaVenta.serie)
      ) {
        correlativoResult = await this.getCorrelativoWithRedis(
          pos,
          notaVenta.serie,
        );
      } else {
        correlativoResult = {
          correlativo: existNotaVenta.correlativo,
          oldCorrelativo: existNotaVenta.correlativo,
        };
      }

      // Usar una única transacción para todo el proceso
      notaVentaEntity = await this.dataSource.transaction(
        async (entityManager) => {
          // Validar serie y correlativo existente
          if (
            !existNotaVenta ||
            (existNotaVenta && existNotaVenta.serie !== notaVenta.serie)
          ) {
            const { oldCorrelativo } = correlativoResult;

            const notaVentaExisting = await entityManager
              .getRepository(NotaVentaEntity)
              .findOne({
                where: {
                  pos: { id: Equal(pos.id) },
                  establecimiento: { id: Equal(establecimiento.id) },
                  empresa: { id: Equal(empresa.id) },
                  tipo_doc: { id: Equal(tipoDocumento.id) },
                  serie: Equal(notaVenta.serie),
                  correlativo: oldCorrelativo,
                },
              });

            if (notaVentaExisting) {
              const serie = `${notaVenta.serie}-${oldCorrelativo}`;
              throw new HttpException(
                `Ya existe un comprobante con la misma serie y correlativo: ${serie}`,
                HttpStatus.BAD_REQUEST,
              );
            }
          }

          const saleResult = await this.createSale(
            notaVenta,
            clienteEntity,
            usuario,
            pos,
            establecimiento,
            empresa,
            tipoDocumento,
            tipoMoneda,
            DECIMAL,
            hasPermissionToCreateClient,
            correlativoResult.oldCorrelativo,
            entityManager,
          );

          if (socketId) {
            this.notaVentaSocketService.setSocket(saleResult.id, socketId);
            this.notaVentaGateway.sendEstado(
              saleResult.id,
              0,
              'GENERANDO',
              'Generando documento...',
              true,
              EnvioSunatModo.NO_ENVIA,
            );
          }

          // La transacción se confirmará automáticamente al finalizar este bloque
          return saleResult;
        },
      );

      this.notaVentaGateway.sendEstado(
        notaVentaEntity.id,
        0,
        'CREADO',
        `Documento creado correctamente`,
        false,
        EnvioSunatModo.NO_ENVIA,
      );
      this.notaVentaSocketService.deleteSocket(notaVentaEntity.id);
    } catch (e) {
      this.logger.error(`Error upsertSale.transaction: ${e.message}`);

      // Si es otro tipo de error, lo propagamos
      throw e;
    }

    validation.fileName = `${notaVentaEntity.empresa.ruc}-${notaVentaEntity.tipo_doc.codigo}-${notaVentaEntity.serie}-${notaVentaEntity.correlativo}`;

    const notaVentaFormatted = await formatListNotaVentas(
      {
        ...notaVentaEntity,
        estado_operacion: 0,
      },
      validation.fileName,
    );

    return this.handleNotaVentaResponse({
      notaVentaEntity,
      fileName: validation.fileName,
      correlativoResult,
      username: usuario.username,
      roomId,
      notaVentaFormated: notaVentaFormatted,
      responseType: 'normal',
      sendMode: EnvioSunatModo.NO_ENVIA,
    });
  }

  private handleNotaVentaResponse({
    notaVentaEntity,
    fileName,
    correlativoResult,
    username,
    roomId,
    notaVentaFormated,
    responseType,
    sendMode,
  }: {
    notaVentaEntity: NotaVentaEntity;
    fileName: string;
    correlativoResult: {
      correlativo: string;
      oldCorrelativo: string;
    };
    username: string;
    roomId: string;
    notaVentaFormated: ListNotaVentaDto;
    responseType: 'draft' | 'normal';
    sendMode: string;
  }): CreatedNotaVentaDto {
    // Determine response configuration based on type
    const config = {
      draft: {
        logMessage: `${username}: ${fileName} creado y de tipo BORRADOR(No envia SUNAT)`,
        message: 'Guardado. Los borradores no se envian a sunat.',
        codigo: 'BORRADOR',
        codigoInt: null,
        pdf80mm: notaVentaFormated.pdf80mm,
        pdf58mm: notaVentaFormated.pdf58mm,
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
        pdf80mm: notaVentaFormated.pdf80mm,
        pdf58mm: notaVentaFormated.pdf58mm,
      },
    }[responseType];

    // Log to server
    this.logger.log(config.logMessage);

    // Emit notifications
    this.notaVentaGateway.server
      .to(roomId)
      .emit('server::newNotaVenta', notaVentaFormated);
    this.notaVentaGateway.server.to(roomId).emit('server::notifyNotaVenta', {
      type: 'sunat.success',
      correlativo: notaVentaEntity.correlativo,
      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
      message: `Se ha creado el comprobante ${fileName}`,
    });

    //Calculamos los totales del notaVenta y obtendran solo 2 decimales
    const totales = this.sunatService.obtenerTotalesInvoices(
      notaVentaEntity.notaVentaDetail,
    );

    return {
      notaVenta: notaVentaEntity,
      fileName: fileName,
      message: config.message,
      codigo_respuesta: config.codigo,
      documento: `${notaVentaEntity.tipo_doc.tipo_documento.toUpperCase()} ELECTRÓNICA`,
      serie: notaVentaEntity.serie,
      correlativo: correlativoResult.correlativo,
      correlativo_registrado: correlativoResult.oldCorrelativo,
      total: `${notaVentaEntity.tipo_moneda.simbolo} ${totales.mtoImpVenta}`,
      pdf80mm: config.pdf80mm,
      pdf58mm: config.pdf58mm,
      sendMode: sendMode,
    };
  }

  async createSale(
    notaVenta: NotaVentaInput,
    clienteEntity: EntidadEntity,
    usuario: UserEntity,
    pos: PosEntity,
    establecimiento: EstablecimientoEntity,
    empresa: EmpresaEntity,
    tipoDocumento: TipodocsEntity,
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
      const details = await this.sunatService.validarYFormatearDetalle(
        notaVenta.detalles,
        decimales,
      );

      //Calculamos los totales del invoice y obtendran solo 2 decimales
      const totales = this.sunatService.obtenerTotalesInvoices(details);

      //Seteamos nuestro obj invoice con sus productos y totales
      const newNotaVenta: NotaVentaEntity = {
        pos: pos,
        tipo_doc: tipoDocumento,
        serie: notaVenta.serie,
        correlativo: correlativo,
        fecha_emision: notaVenta.fechaEmision,
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
        entidad: hasPermissionToCreateClient ? null : notaVenta.nombreCliente,
        entidad_tipo: hasPermissionToCreateClient
          ? null
          : notaVenta.tipoEntidad,
        entidad_documento: hasPermissionToCreateClient
          ? null
          : notaVenta.numeroDocumento,
        entidad_direccion: hasPermissionToCreateClient ? null : '-',
        notaVentaDetail: details,
        observaciones:
          notaVenta.observaciones.length > 0
            ? notaVenta.observaciones.join('|')
            : null,
      };

      // Creamos el notaVenta
      const notaVentaObj = manager.create(NotaVentaEntity, newNotaVenta);

      // Guardamos el notaVenta
      const notaVentaEntity = await manager.save(NotaVentaEntity, notaVentaObj);

      //Recorremos los productos para crear el detalle del notaVenta
      await Promise.all(
        details.map((producto) => {
          const objDetail = manager.create(NotaVentaDetailEntity, {
            ...producto,
            notaVenta: notaVentaEntity,
          });
          return manager.save(NotaVentaDetailEntity, objDetail);
        }),
      );

      // ── Datos de ejemplo (igual al PDF) ───────────────────────────────
      const datosEjemplo: DatosTicket = {
        empresa: {
          razonSocial: notaVentaEntity.empresa.razon_social,
          nombreComercial: notaVentaEntity.empresa.nombre_comercial,
          direccion: notaVentaEntity.empresa.domicilio_fiscal,
        },
        tipoDocumento: notaVentaEntity.tipo_doc.tipo_documento.toUpperCase(),
        serie: `${notaVentaEntity.serie}-${notaVentaEntity.correlativo}`,
        cliente: {
          nombre: notaVentaEntity.cliente.entidad,
          dni: notaVentaEntity.cliente.numero_documento,
        },
        fechaEmision: notaVentaEntity.fecha_emision
          ? dayjs(notaVentaEntity.fecha_emision).format('DD/MM/YYYY HH:mm:ss')
          : '',
        items: details.map((detail) => {
          const igvUnitario =
            (detail.mtoValorUnitario * detail.porcentajeIgv) / 100;
          const mtoPrecioUnitario = detail.mtoValorUnitario + igvUnitario;
          return {
            codigo: detail.codigo,
            descripcion: detail.descripcion,
            cantidad: detail.cantidad,
            unidad: detail.unidad.unidad,
            mtoPrecioUnitario: round(mtoPrecioUnitario),
            precioTotal: round(mtoPrecioUnitario * detail.cantidad),
          };
        }),
        opGravada: totales.mtoOperGravadas,
        igv: totales.mtoIGV,
        total: totales.mtoImpVenta,
        pie1: 'Documento generado en factux.com.pe',
        pie2: '',
      };

      const basePath = `uploads/files/${notaVentaEntity.empresa.ruc}/${notaVentaEntity.establecimiento.codigo}/${notaVentaEntity.tipo_doc.tipo_documento}`;
      const pdf80mm = await getPdf(crearDocTicket(datosEjemplo, 80));
      const pdf58mm = await getPdf(crearDocTicket(datosEjemplo, 58));
      await guardarArchivo(
        `${basePath}/PDF/80mm`,
        `${notaVentaEntity.empresa.ruc}-${notaVentaEntity.tipo_doc.codigo}-${notaVentaEntity.serie}-${notaVentaEntity.correlativo}.pdf`,
        pdf80mm,
        true,
      );
      await guardarArchivo(
        `${basePath}/PDF/58mm`,
        `${notaVentaEntity.empresa.ruc}-${notaVentaEntity.tipo_doc.codigo}-${notaVentaEntity.serie}-${notaVentaEntity.correlativo}.pdf`,
        pdf58mm,
        true,
      );

      return notaVentaEntity;
    } catch (e) {
      this.logger.error(e);
      throw new HttpException(
        `Error al crear la nota de venta intente nuevamente. ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async anularNotaVenta(notaId: number, user: QueryToken) {
    const notaVenta = await this.findOneNotaVentaById(notaId);

    if (!notaVenta) {
      throw new HttpException(
        'La nota de venta no existe.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (notaVenta.estado_anulacion === 2) {
      throw new HttpException(
        'La nota de venta ya se encuentra anulada.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar que la nota pertenece a una empresa asignada al usuario
    const empresas = user.tokenEntityFull.empresas;
    const existEmpresa = empresas.find(
      (emp) => emp.id === notaVenta.empresa.id,
    );

    if (!existEmpresa || !existEmpresa.estado) {
      throw new HttpException(
        'No tienes permisos para anular notas de venta de esta empresa.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Validar que el establecimiento pertenece a la empresa del usuario
    const existEstablecimiento = existEmpresa.establecimientos.find(
      (est) => est.id === notaVenta.establecimiento.id,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'No tienes permisos para anular notas de venta de este establecimiento.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Validar que el POS pertenece al establecimiento del usuario
    const existPos = (existEstablecimiento as any).pos.find(
      (p: any) => p.id === notaVenta.pos.id,
    );

    if (!existPos) {
      throw new HttpException(
        'No tienes permisos para anular notas de venta de este POS.',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      await this.notaVentaRepository.update(
        { id: notaVenta.id },
        { estado_anulacion: 2 },
      );
    } catch {
      throw new HttpException(
        'Error al anular la nota de venta.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { message: 'Nota de venta anulada correctamente.' };
  }

  async validateNotaVentaData(notaVenta: NotaVentaInput, user: QueryToken) {
    const { tokenEntityFull, token_of_permisos } = user;
    const { empresas } = tokenEntityFull;
    let clienteEntity: EntidadEntity | null = null;

    // Validamos que no pueda emitir un notaVenta valido
    const existNotaVenta = await this.findOneNotaVentaById(notaVenta.id);

    if (existNotaVenta) {
      throw new HttpException(
        'No puedes modificar una Nota de Venta ya emitida.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos empresa emisora
    const empresa = (await this.empresaService.findOneEmpresaById(
      notaVenta.empresa,
      true,
    )) as EmpresaEntity;

    //Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
    const existEmpresa = empresas.find((emp) => emp.id === empresa.id);

    if (!existEmpresa || !existEmpresa.estado) {
      throw new HttpException(
        'No puedes emitir Notas de Venta para esta empresa',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos establecimiento emisor
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        notaVenta.establecimiento,
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

    const pos = await this.posService.findPOSById(notaVenta.pos);

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
      (doc) => doc.codigo === notaVenta.tipoDocumento,
    );

    if (!tipDoc || !tipDoc.estado) {
      throw new HttpException(
        'No puedes emitir este tipo de documento o se encuentra desactivado',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Obtenmos serie del establecimiento
    const serie = tipDoc.series.find(
      (item: any) => item.serie === notaVenta.serie,
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
        notaVenta.tipoDocumento,
      );

    const tipoMoneda = await this.monedaService.findOneMonedaByAbrstandar(
      notaVenta.moneda,
    );

    const tipoEntidad = await this.tipoEntidadService.findTipoEntidadByCodigo(
      notaVenta.tipoEntidad,
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
          numero_documento: notaVenta.numeroDocumento,
          empresa: {
            id: empresa.id,
          },
        },
      });

      // Si el cliente no existe, lo creamos y guardamos
      if (!clienteEntity) {
        const clienteObj = this.clienteRepository.create({
          tipo_entidad: tipoEntidad,
          entidad: notaVenta.nombreCliente,
          direccion: '-',
          numero_documento: notaVenta.numeroDocumento,
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
      tipoMoneda,
      tipoEntidad,
      serie,
      token_of_permisos,
      hasPermissionToCreateClient,
      usuario,
      clienteEntity,
    };
  }

  async findOneNotaVentaById(idInvoice: number) {
    let notaVenta: NotaVentaEntity = null;

    try {
      notaVenta = await this.notaVentaRepository.findOne({
        relations: {
          tipo_doc: true,
          cliente: { tipo_entidad: true },
          empresa: true,
          establecimiento: true,
          pos: true,
          tipo_moneda: true,
          usuario: true,
          notaVentaDetail: { tipAfeIgv: true, unidad: true },
        },
        where: {
          id: Equal(idInvoice),
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar la nota de venta NotaVentaService.findOneNotaVentaById',
        HttpStatus.BAD_REQUEST,
      );
    }

    return notaVenta;
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
}
