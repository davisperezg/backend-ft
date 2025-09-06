import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtStrategy } from 'src/lib/strategies/jwt.strategies';
import { AuthService } from 'src/auth/services/auth.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { UsePipes, Logger, forwardRef, Inject } from '@nestjs/common';
import { WSValidationPipe } from 'src/lib/class-validator/ws-validation-error.filter';
import {
  completarConCeros,
  formatListInvoices,
  guardarArchivo,
  quitarCerosIzquierda,
} from 'src/lib/functions';
import Permission from 'src/lib/type/permission.type';
import { setTimeout } from 'timers/promises';
import dayjs from 'dayjs';
import { Between, DataSource, Repository } from 'typeorm';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SunatService } from 'src/sunat/services/sunat.service';
import { CreateComuBajaDTO } from 'src/invoice/dto/create-comunicacion_baja';
import { CreateInvoiceDto } from 'src/invoice/dto/create-invoice.dto';
import { InvoiceService } from 'src/invoice/services/invoice.service';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { InvoiceSocketService } from '../socket-session/services/invoice-socket.service';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';

@UsePipes(WSValidationPipe)
@WebSocketGateway({
  namespace: 'events/invoices',
  cors: '*:*',
  //cors: { origin: ['http://localhost:3000', 'http://localhost:4200'] },
})
export class InvoiceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly messageInterval = 2000;
  private lastMessageTimeMap: Map<string, number> = new Map();
  private logger = new Logger('InvoiceGateway');

  constructor(
    private authService: AuthService,
    private jwtStrategy: JwtStrategy,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    private dataSource: DataSource,
    @InjectRepository(AnulacionEntity)
    private anulacionRepository: Repository<AnulacionEntity>,
    @Inject(forwardRef(() => SunatService))
    private readonly sunatService: SunatService,
    private readonly invoiceSocketService: InvoiceSocketService,
  ) {}

  isAllowed(clientId: string): boolean {
    const currentTime = new Date().getTime();
    const lastMessageTime = this.lastMessageTimeMap.get(clientId) || 0;
    if (currentTime - lastMessageTime >= this.messageInterval) {
      this.lastMessageTimeMap.set(clientId, currentTime);
      return true;
    } else {
      return false;
    }
  }

  async handleConnection(client: Socket, createConexion = true) {
    const token = client.handshake.auth?.token?.split(' ')[1];
    //const token = client.handshake.headers.authorization?.split(' ')[1];

    if (!token || token === 'null') {
      return client.disconnect();
    }

    try {
      // 1. Decodifica y valida el token
      const decodedToken = await this.authService.verifyJwt(token);
      const user = await this.jwtStrategy.validate({
        userId: decodedToken.userId,
      });

      if (!user) {
        return this.disconnect(client);
      }

      if (createConexion) {
        const { empresaId, establecimientoId } = this.getHeaders(client);

        //Validamos si la empresa pertenece al usuario
        const empresas = user.tokenEntityFull.empresas;
        const existEmpresa = empresas.find(
          (emp) => Number(emp.id) === Number(empresaId),
        );
        if (!existEmpresa) {
          return this.disconnect(client);
        }

        //Validamos si el establecimiento pertece a la empresa del usuario
        const establecimiento = existEmpresa.establecimientos;
        const existEstablecimiento = establecimiento.find(
          (est) => Number(est.id) === Number(establecimientoId),
        );
        if (!existEstablecimiento) {
          return this.disconnect(client);
        }

        // Une al cliente a una room por empresa y establecimiento
        client.join(`room_invoices_emp-${empresaId}_est-${establecimientoId}`);
      }

      return user;
    } catch (e) {
      this.disconnect(client, e.message);
    }
  }

  async handleDisconnect(client: Socket) {
    client.disconnect();
  }

  private disconnect(client: Socket, message = 'Unauthorized access') {
    client.emit('error', new WsException(message));
    client.disconnect();
  }

  private exceptionHandler(client: Socket, message = '') {
    client.emit('exception', new WsException(message));
    this.logger.error(`Cliente ${client.id} Excepcion - ${message}.`);
    //client.disconnect();
  }

  @SubscribeMessage('client::newInvoice')
  async newInvoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateInvoiceDto,
  ) {
    if (!this.isAllowed(client.id)) {
      this.logger.warn(
        `Cliente ${client.id} esta enviando mensajes muy rapido - ${client.handshake.headers['user-agent']}:${client.handshake.headers.host}:${client.handshake.address}`,
      );
      client.emit(
        'exception',
        new WsException('Puedes volver a enviar mensajes en 2 segundos'),
      );
      return;
    }

    //Se crearan los CPE de la empresa y establecimiento actual del socket conectado
    const { empresaId, establecimientoId } = this.getHeaders(client);

    try {
      const user = (await this.handleConnection(client, false)) as QueryToken;

      //Validamos permiso de crear facturas
      this.validarPermiso(client, user, Permission.CreateFacturas);

      //Se crea el CPE y valida si la empresa y establecimiento pertecene al usuario
      const res = await this.invoiceService.upsertSale(
        {
          ...data,
          empresa: Number(empresaId),
          establecimiento: Number(establecimientoId),
        },
        user,
        client.id,
      );

      const {
        invoice,
        fileName,
        serie,
        correlativo,
        documento,
        total,
        xml,
        cdr,
        pdfA4,
        correlativo_registrado,
        message,
        sendMode,
      } = res;

      const messageDefaultSunat = `Tu Factura ${invoice.serie}-${invoice.correlativo} ha sido emitida e informada a SUNAT`;

      //Notificamos el nuevo nro de serie al cliente
      client.emit('server::getIdInvoice', {
        invoice: invoice,
        estado: 'success',
        loading: false,
        borrador: invoice.borrador,
        total: total,
        serie: serie,
        documento: documento,
        fileName: fileName,
        message: message,
        numeroConCeros: completarConCeros(
          String(Number(quitarCerosIzquierda(correlativo))),
        ),
        numero: String(Number(quitarCerosIzquierda(correlativo))),
        correlativo_registrado: String(
          Number(quitarCerosIzquierda(correlativo_registrado)),
        ),
        correlativo_registradoConCeros: correlativo_registrado,
        enviada_sunat:
          sendMode === EnvioSunatModo.INMEDIATO && !invoice.borrador
            ? 1
            : invoice.estado_operacion,
        aceptada_sunat:
          sendMode === EnvioSunatModo.INMEDIATO && !invoice.borrador
            ? 'ENVIANDO'
            : 'CREADO',
        codigo_sunat: invoice.respuesta_sunat_codigo,
        mensaje_sunat:
          sendMode === EnvioSunatModo.INMEDIATO && !invoice.borrador
            ? messageDefaultSunat
            : invoice.respuesta_sunat_descripcion,
        otros_sunat: invoice.observaciones_sunat,
        xml: xml,
        cdr: cdr,
        pdfA4: pdfA4,
      });
    } catch (e) {
      this.exceptionHandler(client, e.message);
    }
  }

  @SubscribeMessage('client::sendInvoice')
  async sendInvoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() invoiceId: number,
  ) {
    try {
      const user = (await this.handleConnection(client, false)) as QueryToken;

      //Validamos permiso de crear facturas
      this.validarPermiso(client, user, Permission.CreateFacturas);

      //Se envia el CPE a SUNAT
      await this.invoiceService.sendSale(invoiceId);
    } catch (e) {
      this.exceptionHandler(client, e.message);
    }
  }

  @SubscribeMessage('client::comunicarBaja')
  async comunicacionBaja(
    @MessageBody() data: CreateComuBajaDTO,
    @ConnectedSocket() client: Socket,
  ) {
    //const release = await this.mutex.acquire();
    if (!this.isAllowed(client.id)) {
      this.logger.warn(
        `Cliente ${client.id} esta enviando mensajes muy rapido - ${client.handshake.headers['user-agent']}:${client.handshake.headers.host}:${client.handshake.address}`,
      );
      client.emit(
        'exception',
        new WsException('Puedes volver a enviar mensajes en 2 segundos'),
      );
      return;
    }

    //Se crearan los CPE de la empresa y establecimiento actual del socket conectado
    const { empresaId, establecimientoId } = this.getHeaders(client);

    //Si esta en proceso y es otro usuairo se le notifica
    // if (this.invoiceInProcess) {
    //   release();
    //   this.logger.log(
    //     `Cliente ${client.id} - Otro usuario esta anulando un CPE. Esperando...`,
    //   );
    //   client.emit(
    //     'exception',
    //     new WsException(
    //       'Otro usuario esta anulando un CPE. Por favor, espere.',
    //     ),
    //   );
    //   return;
    // }

    const { serie, numero, motivo } = data;

    try {
      const user = (await this.handleConnection(client, false)) as QueryToken;

      //Validamos permiso de crear facturas
      this.validarPermiso(client, user, Permission.CreateFacturas);

      //Buscamos la factura para anular
      const invoice = await this.invoiceService.findOneInvoice(
        serie,
        numero,
        Number(empresaId),
        Number(establecimientoId),
      );

      //Si ya existe un CPE con el estado aceptado o rechazado no procede a anular
      // if (invoice.estado_anulacion === 2 || invoice.estado_anulacion === 3) {
      //   this.logger.warn(
      //     `Cliente ${client.id} - #${empresaId}:${establecimientoId} ${serie}-${numero} ha intentando anular un CPE que ya fue aceptado o rechazado anteriormente.`,
      //   );
      //   this.server
      //     .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
      //     .emit('server::comuBaja', {
      //       estado: 'warning',
      //       loading: false,
      //       mensaje: `El CPE ${invoice.correlativo} ya fue anulado o rechazado anteriormente.`,
      //       ticket: null,
      //       invoice: null,
      //       correlativo: invoice.correlativo,
      //     });
      //   this.invoiceInProcess = false;
      //   release();
      //   return;
      // }

      // //Si el estado del CDR sunat esta marcado como rechazado no procede a anular
      // if (invoice.estado_operacion !== 2) {
      //   this.logger.warn(
      //     `Cliente ${client.id} - #${empresaId}:${establecimientoId} ${serie}-${numero} ha intentando anular un CPE que no fue aceptado por SUNAT.`,
      //   );
      //   this.server
      //     .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
      //     .emit('server::comuBaja', {
      //       estado: 'warning',
      //       loading: false,
      //       mensaje: `El CPE ${invoice.correlativo} no fue aceptado por SUNAT.`,
      //       ticket: null,
      //       invoice: null,
      //       correlativo: invoice.correlativo,
      //     });
      //   this.invoiceInProcess = false;
      //   release();
      //   return;
      // }

      //Iniciamos proceso de transaccion para dar de baja
      await this.dataSource.transaction(async (manager) => {
        //this.invoiceInProcess = true;
        this.logger.log(`Cliente ${client.id} está anulando un CPE...`);

        // Obtener la fecha actual
        const fechaActual = dayjs();

        // Obtener el inicio del día actual
        const inicioDia = fechaActual.startOf('day').toDate();

        // Obtener el final del día actual
        const finDia = fechaActual.endOf('day').toDate();

        //Consultamos todas las anulaciones de hoy para calcular el correlativo
        const anulacion = await this.anulacionRepository.findBy({
          fecha_comunicacion: Between(inicioDia, finDia),
        });
        const count = anulacion.length + 1;
        const correlativo = completarConCeros(String(count), 5);

        //Obtenemos ticket de sunat
        const ticket = await this.sunatService.generateTicketLow(
          invoice,
          motivo,
          correlativo,
        );

        //Creamos obj para guardar el ticket y la anulacion
        const anulacionObj = this.anulacionRepository.create({
          fecha_comunicacion: ticket.fecha_comunicacion,
          ticket: ticket.numero,
          invoice: invoice,
          numero: correlativo,
        });

        //Guardamos ticket en db anulacion
        const anulacionEntity = await manager.save(
          AnulacionEntity,
          anulacionObj,
        );

        //actualizamos estado interno del invoice a 1(enviado con obtencion de ticket)
        await manager.update(
          InvoiceEntity,
          { id: invoice.id },
          { estado_anulacion: 1 },
        );

        const _invoice = await formatListInvoices(
          {
            ...invoice,
            estado_anulacion: 1,
          },
          ticket.fileName,
        );

        //Notificamos a todos los clientes que se ha enviado la baja con obtencion de ticket
        this.server
          .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
          .emit('server::comuBaja', {
            estado: 'success',
            invoice: _invoice,
          });

        //Notificamos al cliente que se ha enviado la baja con obtencion de ticket
        client.emit('server::comuBaja', {
          estado: 'success',
          loading: true,
          mensaje: 'La sunat respondio con un ticket.',
          ticket: ticket.numero,
          invoice: _invoice,
          correlativo: `${_invoice.serie}-${_invoice.correlativo}`,
        });

        await setTimeout(2000);

        //ENVIAMOS TICKET A SUNAT PARA LA BAJA DE COMUNICACION
        const sunat = await this.sunatService.sendSunatTicket(
          invoice,
          ticket.numero,
        );

        //Liberamos el proceso de envio
        // this.invoiceInProcess = false;
        // release();

        this.logger.log(
          `Cliente ${client.id} ha anulado correctamente un nuevo CPE ${invoice.correlativo}.`,
        );

        const { cdrZip, codigo_sunat, mensaje_sunat, observaciones_sunat } =
          sunat;

        const observaciones_sunat_modified =
          (observaciones_sunat as []).length > 0
            ? observaciones_sunat.join('|')
            : null;

        //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
        const CdrZip = Buffer.from(cdrZip, 'base64');

        //Guardamos archivo CDR
        await guardarArchivo(
          `uploads/files/${invoice.empresa.ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/RPTA`,
          `R-${ticket.fileName}.zip`,
          CdrZip,
          true,
        );

        //Actualizamos el estado de la anulacion desde la respuesta sunat CDR
        await manager.update(
          InvoiceEntity,
          { id: invoice.id },
          {
            respuesta_anulacion_codigo: codigo_sunat,
            respuesta_anulacion_descripcion: mensaje_sunat,
            observaciones_sunat: observaciones_sunat_modified,
          },
        );

        //Actualizamos respuesta de la anulacion
        await manager.update(
          AnulacionEntity,
          { id: anulacionEntity.id },
          {
            respuesta: mensaje_sunat,
          },
        );

        if (codigo_sunat === 0) {
          //2(anulacion aceptada)
          await manager.update(
            InvoiceEntity,
            { id: invoice.id },
            { estado_anulacion: 2 },
          );

          const _invoice = await formatListInvoices(
            {
              ...invoice,
              estado_anulacion: 2,
              respuesta_anulacion_codigo: codigo_sunat,
              respuesta_anulacion_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            ticket.fileName,
          );

          this.logger.log(`Cliente ${client.id} - ${mensaje_sunat}.`);

          //Notificamos a todos los clientes que se ha enviado la baja con obtencion de ticket
          this.server
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::comuBaja', {
              estado: 'successfull',
              invoice: _invoice,
            });

          //Notificamos al cliente que se ha enviado la baja con obtencion de ticket
          client.emit('server::comuBaja', {
            estado: 'successfull',
            loading: false,
            mensaje: mensaje_sunat,
            ticket: ticket.numero,
            invoice: _invoice,
            correlativo: _invoice.correlativo,
          });
        } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
          //3(anulacion rechazada)
          await manager.update(
            InvoiceEntity,
            { id: invoice.id },
            { estado_anulacion: 3 },
          );

          const _invoice = await formatListInvoices(
            {
              ...invoice,
              estado_anulacion: 3,
              respuesta_anulacion_codigo: codigo_sunat,
              respuesta_anulacion_descripcion: mensaje_sunat,
              observaciones_sunat: observaciones_sunat_modified,
            },
            ticket.fileName,
          );

          this.logger.error(
            `Cliente ${client.id} ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
          );

          //Notificamos a todos los clientes que se ha enviado la baja con obtencion de ticket
          this.server
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::comuBaja', {
              estado: 'error',
              invoice: _invoice,
            });

          //Notificamos al cliente que se ha enviado la baja con obtencion de ticket
          client.emit('server::comuBaja', {
            estado: 'error',
            loading: false,
            mensaje: mensaje_sunat,
            ticket: ticket.numero,
            invoice: _invoice,
            correlativo: _invoice.correlativo,
          });
        } else {
          this.logger.warn(`Cliente ${client.id} - Warning:${mensaje_sunat}.`);

          //Notificamos al cliente que se ha enviado la baja con obtencion de ticket
          client
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::comuBaja', {
              estado: 'error',
              loading: false,
              mensaje:
                'Excepcion en la comunicacion con sunat para la baja intente mas tarde.',
              ticket: ticket.numero,
              invoice: _invoice,
              correlativo: _invoice.correlativo,
            });
        }
      });
    } catch (e) {
      //release();
      //this.invoiceInProcess = false;

      this.logger.error(
        `Cliente ${client.id} CPE#${empresaId}-${establecimientoId} ${serie}-${numero} - ${e.message}.`,
      );

      //Notificamos que ocurrio un error y liberamos loading
      client.emit('server::comuBaja', {
        estado: 'excepcion',
        loading: false,
        mensaje: `${e.message}`,
        invoice: null,
        correlativo: `${serie}-${numero}`,
      });

      this.exceptionHandler(client, e.message);
    }
    //FIN
  }

  sendEstadoSunat(
    invoiceId: number,
    codigo_estado: number,
    nombre_estado: string,
    mensaje: string,
    loading: boolean,
    sendMode?: string,
    codigo?: string,
    otros?: string,
    xml?: string,
    cdr?: string,
    pdfA4?: string,
  ) {
    const socketId = this.invoiceSocketService.getSocket(invoiceId);

    if (socketId) {
      this.server.to(socketId).emit('server::statusInvoice', {
        invoiceId,
        codigo_estado,
        nombre_estado,
        mensaje,
        loading,
        sendMode,
        codigo,
        otros,
        xml,
        cdr,
        pdfA4,
      });
    }
  }

  private validarPermiso(
    client: Socket,
    user: QueryToken,
    permiso: Permission,
  ): void {
    if (!user) return;

    const tienePermiso = user.token_of_permisos.includes(permiso);

    if (!tienePermiso) {
      this.exceptionHandler(client, 'No tienes permisos suficientes');
    }
  }

  private getHeaders(client: Socket) {
    const empresaId = client.handshake.query['empresa-id'] as string;
    const establecimientoId = client.handshake.query[
      'establecimiento-id'
    ] as string;

    if (!empresaId || !establecimientoId) {
      this.disconnect(
        client,
        'No se ha enviado el id de la empresa o establecimiento',
      );
      return;
    }

    return {
      empresaId,
      establecimientoId,
    };
  }
}
