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
import { completarConCeros, quitarCerosIzquierda } from 'src/lib/functions';
import Permission from 'src/lib/type/permission.type';
import { DataSource } from 'typeorm';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';
import { NotaVentaInput } from 'src/nota-venta/inputs/nota-venta.input';
import { NotaVentaService } from 'src/nota-venta/services/nota-venta.service';
import { NotaVentaSocketService } from 'src/socket-session/services/notaVenta-socket.service';

@UsePipes(WSValidationPipe)
@WebSocketGateway({
  namespace: 'events/nota-ventas',
  cors: '*:*',
  //cors: { origin: ['http://localhost:3000', 'http://localhost:4200'] },
})
export class NotaVentaGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly messageInterval = 2000;
  private lastMessageTimeMap: Map<string, number> = new Map();
  private logger = new Logger('NotaVentasGateway');

  constructor(
    private authService: AuthService,
    private jwtStrategy: JwtStrategy,
    @Inject(forwardRef(() => NotaVentaService))
    private readonly notaVentaService: NotaVentaService,
    private readonly notaVentaSocketService: NotaVentaSocketService,
  ) {}

  //   private dataSource: DataSource,
  //   private readonly notaVentaSocketService: NotaVentaSocketService,
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
        client.join(
          `room_notasventas_emp-${empresaId}_est-${establecimientoId}`,
        );
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

  @SubscribeMessage('client::mensaje')
  async newNotaVentax(@ConnectedSocket() client: Socket) {
    client.emit('mensajerespuesta', `Hola , tu mensaje ha sido recibido!`);
  }

  @SubscribeMessage('client::newNotaVenta')
  async newNotaVenta(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: NotaVentaInput,
  ) {
    console.log(data);
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
      const res = await this.notaVentaService.createNotaVenta(
        {
          ...data,
          empresa: Number(empresaId),
          establecimiento: Number(establecimientoId),
        },
        user,
        client.id,
      );

      const {
        notaVenta,
        fileName,
        serie,
        correlativo,
        documento,
        total,
        pdf58mm,
        pdf80mm,
        correlativo_registrado,
        message,
      } = res;

      //const messageDefaultSunat = `Tu Factura ${invoice.serie}-${invoice.correlativo} ha sido emitida e informada a SUNAT`;

      //Notificamos el nuevo nro de serie al cliente
      client.emit('server::getIdNotaVenta', {
        notaVenta: notaVenta,
        estado: 'success',
        loading: false,
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
        observaciones: notaVenta.observaciones,
        pdf58mm: pdf58mm,
        pdf80mm: pdf80mm,
      });
    } catch (e) {
      console.log(e);
      this.exceptionHandler(client, e.message);
    }
  }

  sendEstado(
    notaVentaId: number,
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
    const socketId = this.notaVentaSocketService.getSocket(notaVentaId);

    if (socketId) {
      this.server.to(socketId).emit('server::statusNotaVenta', {
        notaVentaId,
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
