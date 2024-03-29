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
import { ConnectionService } from 'src/connection/services/connection.service';
import { AuthService } from 'src/auth/services/auth.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { InvoiceService } from '../services/invoice.service';
import { IsUUID } from 'class-validator';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UseFilters, UsePipes, Logger } from '@nestjs/common';
import { WSValidationPipe } from 'src/lib/class-validator/ws-validation-error.filter';
import {
  completarConCeros,
  quitarCerosIzquierda,
  validarFormatoUUID,
} from 'src/lib/functions';
import Permission from 'src/lib/type/permission.type';
import { setTimeout } from 'timers/promises';
import { Mutex } from 'async-mutex';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import path from 'path';
import { docDefinitionA4 } from 'src/lib/const/pdf';
import * as fs from 'fs';
import dayjs from 'dayjs';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { Cron } from '@nestjs/schedule';

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

  private readonly messageInterval = 5000;
  private lastMessageTimeMap: Map<string, number> = new Map();
  private invoiceInProcess = false;
  private mutex = new Mutex();
  private logger = new Logger('InvoiceGateway');

  constructor(
    private connectionService: ConnectionService,
    private authService: AuthService,
    private jwtStrategy: JwtStrategy,
    private invoiceService: InvoiceService,
    private establecimientoService: EstablecimientoService,
    private empresaService: EmpresaService,
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

  //Se ejecutara esta tarea todos los dias a las 1am -> enviara todos cpes pendientes a sunat
  @Cron('0 0,20,40,59 1 * * *')
  async handleCron() {
    this.logger.debug(
      'INICIANDO ENVIO DE COMPROBANTES A SUNAT MEDIANTE CRON...',
    );
    try {
      const establecimientos =
        await this.establecimientoService.findAllEstablecimientos();

      const estMaped = establecimientos
        .map((est) => {
          if (est.estado && est.empresa.estado) {
            return {
              idEstablecimiento: est.id,
              idEmpresa: est.empresa.id,
              anexo: est.codigo,
              empresa: est.empresa.ruc + ' - ' + est.empresa.razon_social,
              estado: est.estado ? 'Activo' : 'Inactivo',
              enviar_inmediatamente_a_sunat: est.configsEstablecimiento.some(
                (config) => config.enviar_inmediatamente_a_sunat,
              ),
            };
          }
        })
        .filter(Boolean);

      for (let index = 0; index < estMaped.length; index++) {
        const item = estMaped[index];
        const idEmpresa = item.idEmpresa;
        const idEstablecimiento = item.idEstablecimiento;

        if (item.enviar_inmediatamente_a_sunat) {
          const invoices = await this.invoiceService.findAllInvoicesCron(
            idEmpresa,
            idEstablecimiento,
          );

          for (let indexIvs = 0; indexIvs < invoices.length; indexIvs++) {
            const invoice = invoices[indexIvs];
            //Todos los cpes con estado 1 se enviaran a sunat para que actualicen a estado 2
            switch (invoice.estado_operacion) {
              case 1:
                const ruc = invoice.empresa.ruc;
                const tipoDoc = invoice.tipo_doc.codigo;
                const serie = invoice.serie;
                const correlativo = invoice.correlativo;
                const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
                //para enviar cada cpe buscamos y leermos el archivo xml firmado en la carpeta uploads
                const pathDir = path.join(
                  process.cwd(),
                  `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/FIRMA/${fileName}.xml`,
                );

                //si no existe el xml firmado no procede a enviar sunat pero normalmente siempre debe existir un xml firmado
                if (!fs.existsSync(pathDir)) break;

                try {
                  const xmlSigned = fs.readFileSync(pathDir, 'utf8');
                  const sunat = await this.invoiceService.enviarSunat(
                    invoice.empresa.web_service,
                    invoice.empresa.ose_enabled
                      ? invoice.empresa.usu_secundario_ose_user
                      : invoice.empresa.usu_secundario_user,
                    invoice.empresa.ose_enabled
                      ? invoice.empresa.usu_secundario_ose_password
                      : invoice.empresa.usu_secundario_password,
                    fileName,
                    xmlSigned,
                  );

                  const {
                    cdrZip,
                    codigo_sunat,
                    mensaje_sunat,
                    observaciones_sunat,
                  } = sunat.data;

                  const observaciones_sunat_modified =
                    (observaciones_sunat as []).length > 0
                      ? observaciones_sunat.join('|')
                      : null;

                  //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
                  const CdrZip = Buffer.from(cdrZip, 'base64');

                  //Guardamos el CDR en el servidor en el directorio del cliente
                  this.invoiceService.guardarArchivo(
                    invoice.empresa.ruc,
                    `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA`,
                    `R-${fileName}.zip`,
                    CdrZip,
                    true,
                  );

                  if (codigo_sunat === 0) {
                    const updated =
                      await this.invoiceService.updateEstadoOperacion(
                        invoice.id,
                        2,
                      ); //cambiamos a aceptado

                    invoice.estado_operacion = updated.estado_operacion;

                    await this.invoiceService.updateRptaSunat(
                      invoice.id,
                      codigo_sunat,
                      mensaje_sunat,
                      observaciones_sunat_modified,
                    );

                    this.logger.log(`ServerResponse - ${mensaje_sunat}.`);

                    this.server
                      .to(
                        `room_invoices_emp-${idEmpresa}_est-${idEstablecimiento}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.success',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `${mensaje_sunat}`,
                      });
                  } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
                    const updated =
                      await this.invoiceService.updateEstadoOperacion(
                        invoice.id,
                        3,
                      ); //cambiamos a rechazado

                    await this.invoiceService.updateRptaSunat(
                      invoice.id,
                      codigo_sunat,
                      mensaje_sunat,
                      observaciones_sunat_modified,
                    );

                    invoice.estado_operacion = updated.estado_operacion;

                    this.logger.error(
                      `ServerResponse ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                    );

                    this.server
                      .to(
                        `room_invoices_emp-${idEmpresa}_est-${idEstablecimiento}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.failed',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `El CPE#${invoice.correlativo} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                      });
                  } else {
                    this.logger.warn(
                      `ServerResponse - Warning:${mensaje_sunat}.`,
                    );

                    this.server
                      .to(
                        `room_invoices_emp-${idEmpresa}_est-${idEstablecimiento}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.warn',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `El CPE#${invoice.correlativo}  -  Warning:${mensaje_sunat}.`,
                      });
                  }

                  //notificar al cliente con el eveneto
                  this.server
                    .to(
                      `room_invoices_emp-${idEmpresa}_est-${idEstablecimiento}`,
                    )
                    .emit('server::listInvoices', invoices);
                  break;
                } catch (e) {
                  const mensaje = e.message;

                  this.logger.warn(
                    `ServerResponse - ${idEmpresa}-${idEstablecimiento}#${fileName} - Warning:${mensaje}.`,
                  );

                  this.server
                    .to(
                      `room_invoices_emp-${idEmpresa}_est-${idEstablecimiento}`,
                    )
                    .emit('server::notifyInvoice', {
                      type: 'error',
                      correlativo: invoice.correlativo,
                      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                      message: mensaje,
                    });

                  //Esto no deberia de ocurrir pero si ocurre se debemos de actualizar estado
                  //Buscaremos el codigo de error sunat 1033
                  //1033 significa que el comprobante fue registrado previamente con otros datos
                  const existCodigo = mensaje.match(/\[(\d+)\]/);
                  const codigo = existCodigo && existCodigo[1];
                  if (codigo === '1033' && invoice.estado_operacion === 1) {
                    this.logger.log(
                      'ENCONTRAMOS ERROR 1033 LO SOLUCIONAREMOS...',
                    );
                    //cambiamos de estado 1(enviando) a 2(enviado)
                    await this.invoiceService.updateEstadoOperacion(
                      invoice.id,
                      2,
                    ); //cambiamos a aceptado
                  }

                  if (codigo === '2109' && invoice.estado_operacion === 1) {
                    this.logger.log(
                      'ENCONTRAMOS ERROR 2109 LO SOLUCIONAREMOS...',
                    );
                  }

                  continue;
                }
            }
          }
        }
      }
    } catch (e) {
      this.logger.error('OCURRIO UN ERROR EN EL PROCESO DE CRON.', e.message);
    }
    this.logger.debug('PROCESO DE ENVIO A SUNAT MEDIANTE CRON A FINALIZADO.');
  }

  async handleConnection(client: Socket, createConexion = true) {
    //Si no existe token se desconecta
    const token = client.handshake.auth?.token?.split(' ')[1];
    //const tokenx = client.handshake.headers.authorization?.split(' ')[1];

    if (!token || token === 'null') {
      return client.disconnect();
    }

    // if (!tokenx) {
    //   if (!token || token === 'null') {
    //     return client.disconnect();
    //   }
    // }

    try {
      // decodificamos el token
      const decodedToken = await this.authService.verifyJwt(token);

      //Si el usuario no coincide con la db se desconecta
      const user = await this.jwtStrategy.validate({
        userId: decodedToken.userId,
      });

      if (!user) {
        return this.disconnect(client);
      } else {
        //const socketsKeys = [...socket.nsp.sockets.keys()];
        //const uniqueSocket = socketsKeys[socketsKeys.length - 1];
        // const objetoSocket = [...client.nsp.sockets.entries()].find(
        //   ([id]) => id === client.id,
        // );

        if (createConexion) {
          //Si encuentra usuario en la db
          // const { tokenEntityFull } = user;

          // const userMysql = await this.authService.findOneUserMysqlByObjId(
          //   String(tokenEntityFull._id),
          // );

          // save one connection of the user in our database
          // await this.connectionService.create({
          //   socketId: socket.id,
          //   connectedUser: userMysql,
          //   uuid_client: uuidClient,
          //   socketIdClient: (objetoSocket[1].client as any).id,
          // });

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

          client.join(
            `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
          );
        }

        return user;
      }
    } catch (e) {
      this.disconnect(client, e.message);
    }
  }

  async handleDisconnect(client: Socket) {
    // remove the connection from our db
    //const user = (await this.handleConnection(client, false)) as QueryToken;
    //await this.connectionService.deleteBySocketId(socket.id);
    // if (user) {
    //   const getUser = await this.authService.findOneUserMysqlByObjId(
    //     String(user.tokenEntityFull._id),
    //   );
    //   await this.connectionService.deleteAllByUser(getUser.id);
    // }
    client.disconnect();
  }

  private disconnect(client: Socket, message = 'Unauthorized access') {
    client.emit('error', new WsException(message));
    client.disconnect();
  }

  private exceptionHandler(client: Socket, message = '') {
    client.emit('exception', new WsException(message));
    this.logger.error(`Cliente ${client.id} - ${message}.`);
    //client.disconnect();
  }

  @SubscribeMessage('client::getInvoices')
  async findAll(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      const user = (await this.handleConnection(client, false)) as QueryToken;
      //Validamos permiso
      this.validarPermiso(client, user, Permission.ListInvoices);

      const { empresaId, establecimientoId } = this.getHeaders(client);

      //validar si la empresa y el estableimiento pertenece al usuario
      const empresa = (await this.empresaService.findOneEmpresaById(
        Number(empresaId),
        true,
      )) as EmpresaEntity;

      const empresasAsignadas = user.tokenEntityFull.empresas;
      //Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
      const existEmpresa = empresasAsignadas.find(
        (emp) => emp.id === empresa.id,
      );
      if (!existEmpresa) {
        this.disconnect(client);
        return;
      }

      const establecimiento =
        await this.establecimientoService.findEstablecimientoById(
          Number(establecimientoId),
        );

      //Validamos si el establecimiento emisor pertenece a las empresas asignadas al usuario
      const existEstablecimiento = existEmpresa.establecimientos.find(
        (est) => est.id === establecimiento.id,
      );

      if (!existEstablecimiento) {
        this.disconnect(client);
        return;
      }
      //fin validar

      //Se mostraran todos los CPE de la empresa y establecimiento actual
      const invoices = await this.invoiceService.getInvoicesToNotify(
        Number(empresaId),
        Number(establecimientoId),
      );

      const configuraciones = establecimiento.configsEstablecimiento;

      //Si el establecimiento actual tiene la configuracion de enviar inmediatamente a sunat se enviara y notifica a los usaurios
      if (
        configuraciones.some((config) => config.enviar_inmediatamente_a_sunat)
      ) {
        for (let index = 0; index < invoices.length; index++) {
          const invoice = invoices[index];

          switch (invoice.estado_operacion) {
            //creado
            case 0:
              const updated = await this.invoiceService.updateEstadoOperacion(
                invoice.id,
                1,
              ); //cambiamos estado a enviando...

              //actualizamos el estado
              invoice.estado_operacion = updated.estado_operacion;

              this.logger.log(
                `Cliente#getInvoices ${client.id} - está enviando CPE ${invoice.correlativo} a SUNAT.`,
              );

              //Una vez cambiado a loading mandamos a sunat
              if (invoice.estado_operacion === 1) {
                try {
                  const ruc = invoice.empresa.ruc;
                  const tipoDoc = invoice.tipo_doc.codigo;
                  const serie = invoice.serie;
                  const correlativo = invoice.correlativo;
                  const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
                  //para enviar cada cpe buscamos y leermos el archivo xml firmado en la carpeta uploads
                  const pathDir = path.join(
                    process.cwd(),
                    `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/FIRMA/${fileName}.xml`,
                  );

                  //si no existe el xml firmado no procede a enviar sunat pero normalmente siempre debe existir un xml firmado
                  if (!fs.existsSync(pathDir)) {
                    this.logger.error(
                      `Cliente ${client.id} CPE ${invoice.correlativo} - No se encontró XML firmado.`,
                    );
                    break;
                  }

                  const xmlSigned = fs.readFileSync(pathDir, 'utf8');

                  const sunat = await this.invoiceService.enviarSunat(
                    invoice.empresa.web_service,
                    invoice.empresa.ose_enabled
                      ? invoice.empresa.usu_secundario_ose_user
                      : invoice.empresa.usu_secundario_user,
                    invoice.empresa.ose_enabled
                      ? invoice.empresa.usu_secundario_ose_password
                      : invoice.empresa.usu_secundario_password,
                    fileName,
                    xmlSigned,
                  );

                  const {
                    cdrZip,
                    codigo_sunat,
                    mensaje_sunat,
                    observaciones_sunat,
                  } = sunat.data;

                  const observaciones_sunat_modified =
                    (observaciones_sunat as []).length > 0
                      ? observaciones_sunat.join('|')
                      : null;

                  //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
                  const CdrZip = Buffer.from(cdrZip, 'base64');

                  //Guardamos el CDR en el servidor en el directorio del cliente
                  this.invoiceService.guardarArchivo(
                    invoice.empresa.ruc,
                    `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA`,
                    `R-${fileName}.zip`,
                    CdrZip,
                    true,
                  );

                  if (codigo_sunat === 0) {
                    const updated =
                      await this.invoiceService.updateEstadoOperacion(
                        invoice.id,
                        2,
                      ); //cambiamos a aceptado

                    await this.invoiceService.updateRptaSunat(
                      invoice.id,
                      codigo_sunat,
                      mensaje_sunat,
                      observaciones_sunat_modified,
                    );

                    //actualizamos en tiempo real la lista principal
                    invoice.estado_operacion = updated.estado_operacion;

                    this.logger.log(`Cliente ${client.id} - ${mensaje_sunat}.`);

                    this.server
                      .to(
                        `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.success',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `${mensaje_sunat}`,
                      });
                  } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
                    const updated =
                      await this.invoiceService.updateEstadoOperacion(
                        invoice.id,
                        3,
                      ); //cambiamos a rechazado

                    await this.invoiceService.updateRptaSunat(
                      invoice.id,
                      codigo_sunat,
                      mensaje_sunat,
                      observaciones_sunat_modified,
                    );

                    //actualizamos en tiempo real la lista principal
                    invoice.estado_operacion = updated.estado_operacion;

                    this.logger.error(
                      `Cliente ${client.id} ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                    );

                    this.server
                      .to(
                        `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.failed',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `El CPE#${invoice.correlativo} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                      });
                  } else {
                    this.logger.warn(
                      `Cliente ${client.id} - Warning:${mensaje_sunat}.`,
                    );

                    this.server
                      .to(
                        `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                      )
                      .emit('server::notifyInvoice', {
                        type: 'sunat.warn',
                        correlativo: invoice.correlativo,
                        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                        message: `El CPE#${invoice.correlativo}  -  Warning:${mensaje_sunat}.`,
                      });
                  }
                } catch (e) {
                  this.logger.error(
                    `Cliente ${client.id} CPE ${invoice.correlativo} - ${e.message}.`,
                  );

                  this.server
                    .to(
                      `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                    )
                    .emit('server::notifyInvoice', {
                      type: 'error',
                      correlativo: invoice.correlativo,
                      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                      message: e.message,
                    });
                  continue;
                }
              }

              break;

            //enviando...
            case 1:
              try {
                const ruc = invoice.empresa.ruc;
                const tipoDoc = invoice.tipo_doc.codigo;
                const serie = invoice.serie;
                const correlativo = invoice.correlativo;
                const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
                //para enviar cada cpe buscamos y leermos el archivo xml firmado en la carpeta uploads
                const pathDir = path.join(
                  process.cwd(),
                  `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/FIRMA/${fileName}.xml`,
                );

                //si no existe el xml firmado no procede a enviar sunat pero normalmente siempre debe existir un xml firmado
                if (!fs.existsSync(pathDir)) {
                  this.logger.error(
                    `Cliente ${client.id} CPE ${invoice.correlativo} - No se encontró XML firmado.`,
                  );
                  break;
                }

                const xmlSigned = fs.readFileSync(pathDir, 'utf8');

                const sunat = await this.invoiceService.enviarSunat(
                  invoice.empresa.web_service,
                  invoice.empresa.ose_enabled
                    ? invoice.empresa.usu_secundario_ose_user
                    : invoice.empresa.usu_secundario_user,
                  invoice.empresa.ose_enabled
                    ? invoice.empresa.usu_secundario_ose_password
                    : invoice.empresa.usu_secundario_password,
                  fileName,
                  xmlSigned,
                );

                const {
                  cdrZip,
                  codigo_sunat,
                  mensaje_sunat,
                  observaciones_sunat,
                } = sunat.data;

                const observaciones_sunat_modified =
                  (observaciones_sunat as []).length > 0
                    ? observaciones_sunat.join('|')
                    : null;

                //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
                const CdrZip = Buffer.from(cdrZip, 'base64');

                //Guardamos el CDR en el servidor en el directorio del cliente
                this.invoiceService.guardarArchivo(
                  invoice.empresa.ruc,
                  `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA`,
                  `R-${fileName}.zip`,
                  CdrZip,
                  true,
                );

                if (codigo_sunat === 0) {
                  const updated =
                    await this.invoiceService.updateEstadoOperacion(
                      invoice.id,
                      2,
                    ); //cambiamos a aceptado

                  await this.invoiceService.updateRptaSunat(
                    invoice.id,
                    codigo_sunat,
                    mensaje_sunat,
                    observaciones_sunat_modified,
                  );

                  //actualizamos en tiempo real la lista principal
                  invoice.estado_operacion = updated.estado_operacion;

                  this.logger.log(`Cliente ${client.id} - ${mensaje_sunat}.`);

                  this.server
                    .to(
                      `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                    )
                    .emit('server::notifyInvoice', {
                      type: 'sunat.success',
                      correlativo: invoice.correlativo,
                      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                      message: `${mensaje_sunat}`,
                    });
                } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
                  const updated =
                    await this.invoiceService.updateEstadoOperacion(
                      invoice.id,
                      3,
                    ); //cambiamos a rechazado

                  await this.invoiceService.updateRptaSunat(
                    invoice.id,
                    codigo_sunat,
                    mensaje_sunat,
                    observaciones_sunat_modified,
                  );

                  //actualizamos en tiempo real la lista principal
                  invoice.estado_operacion = updated.estado_operacion;

                  this.logger.error(
                    `Cliente ${client.id} ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                  );

                  this.server
                    .to(
                      `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                    )
                    .emit('server::notifyInvoice', {
                      type: 'sunat.failed',
                      correlativo: invoice.correlativo,
                      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                      message: `El CPE#${invoice.correlativo} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                    });
                } else {
                  this.logger.warn(
                    `Cliente ${client.id} - Warning:${mensaje_sunat}.`,
                  );

                  this.server
                    .to(
                      `room_invoices_emp-${empresaId}_est-${establecimientoId}`,
                    )
                    .emit('server::notifyInvoice', {
                      type: 'sunat.warn',
                      correlativo: invoice.correlativo,
                      time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                      message: `El CPE#${invoice.correlativo}  -  Warning:${mensaje_sunat}.`,
                    });
                }
              } catch (e) {
                this.logger.error(
                  `Cliente ${client.id} CPE ${invoice.correlativo} - ${e.message}.`,
                );

                this.server
                  .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
                  .emit('server::notifyInvoice', {
                    type: 'error',
                    correlativo: invoice.correlativo,
                    time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                    message: e.message,
                  });
                continue;
              }
              break;
            //si el cpe es aceptado(2) o rechazado(3) evalumos si existe su archivo cdr
            default:
              const modo = empresa.modo;
              //si el modo esta en desarrollo no descargamos el cdr
              if (modo === 0) break;
              const ruc = invoice.empresa.ruc;
              const tipoDoc = invoice.tipo_doc.codigo;
              const serie = invoice.serie;
              const correlativo = invoice.correlativo;
              const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
              const pathCdrExisting = path.join(
                process.cwd(),
                `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA/R-${fileName}.zip`,
              );

              //esperamos para revisar si ya existe ya que al crear un cpe emite un evento de listInvoices
              await setTimeout(5000);

              //si no existe el archivo cdr lo descargamos
              if (!fs.existsSync(pathCdrExisting)) {
                //si no usa ose usaremos el url de greenter para consultar-cdr
                if (!empresa.ose_enabled) {
                  const ususec = empresa.usu_secundario_user;
                  const passsec = empresa.usu_secundario_password;
                  const res = await this.invoiceService.consultarCDR(
                    ususec,
                    passsec,
                    ruc,
                    tipoDoc,
                    serie,
                    correlativo,
                  );
                  //si la consulta responde con un success true, descargamos el cdr ya existente y lo guardamos
                  if (res.data.success) {
                    const { cdrZip } = res.data;
                    const CdrZip = Buffer.from(cdrZip, 'base64');

                    //Guardamos el CDR en el servidor en el directorio del cliente
                    this.invoiceService.guardarArchivo(
                      empresa.ruc,
                      `${establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA`,
                      `R-${fileName}.zip`,
                      CdrZip,
                      true,
                    );
                  }
                }
              }

              break;
          }
        }
      } else {
        //Si hay cpe en estado 1 y el cliente desactiva el envio inmediato a sunat procedemores a cancelar el envio
        //cambiando el estado de 1 a 0(creado)
        for (let index = 0; index < invoices.length; index++) {
          const invoice = invoices[index];

          switch (invoice.estado_operacion) {
            case 1:
              const updated = await this.invoiceService.updateEstadoOperacion(
                invoice.id,
                0,
              ); //cambiamos a creado

              invoice.estado_operacion = updated.estado_operacion;

              this.server
                .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
                .emit('server::notifyInvoice', {
                  type: 'sunat.success',
                  correlativo: '#',
                  time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                  message: `Se cambio la configuración de envio inmediato a sunat para: ${empresa.razon_social}-${establecimiento.codigo}`,
                });
              break;
          }
        }
      }
    } catch (e) {
      this.exceptionHandler(client, e.message);
    }
  }

  @SubscribeMessage('client::newInvoice')
  async newInvoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateInvoiceDto,
  ) {
    const release = await this.mutex.acquire();
    if (!this.isAllowed(client.id)) {
      this.logger.log(
        `Cliente ${client.id} esta enviando mensajes muy rapido - ${client.handshake.headers['user-agent']}:${client.handshake.headers.host}:${client.handshake.address}`,
      );
      client.emit(
        'exception',
        new WsException('Puedes volver a enviar mensajes en 5 segundos'),
      );
      release();
      return;
    }

    //Se crearan los CPE de la empresa y establecimiento actual del socket conectado
    const { empresaId, establecimientoId } = this.getHeaders(client);

    //Si esta en proceso y es otro usuairo se le notifica
    if (this.invoiceInProcess) {
      this.logger.log(
        `Cliente ${client.id} - Otro usuario esta creando un CPE. Esperando...`,
      );
      client.emit(
        'server::invoiceInProcess',
        'Otro usuario esta creando un CPE. Por favor, espere.',
      );
      release();
      return;
    }

    const user = (await this.handleConnection(client, false)) as QueryToken;

    //Validamos permiso de crear facturas
    this.validarPermiso(client, user, Permission.CreateFacturas);

    this.invoiceInProcess = true;
    this.logger.log(`Cliente ${client.id} está creando un CPE...`);

    //Se crea el CPE y valida si la empresa y establecimiento pertecene al usuario
    const res = await this.invoiceService.createInvoice(
      {
        ...data,
        empresa: Number(empresaId),
        establecimiento: Number(establecimientoId),
      },
      user,
    );

    const { invoice, fileName, xmlSigned } = res;

    this.invoiceInProcess = false;
    release();
    this.logger.log(
      `Cliente ${client.id} ha creado correctamente un nuevo CPE ${invoice.correlativo}.`,
    );

    //Notificamos el nuevo nro de serie al cliente
    this.server
      .to(
        `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`,
      )
      .emit('server::getIdInvoice', {
        estado: 'success',
        loading: false,
        mensaje: 'El CPE se ha creado correctamente.',
        observacion: 'El CPE no se ha enviado a SUNAT.',
        numeroConCeros: completarConCeros(
          String(Number(quitarCerosIzquierda(invoice.correlativo)) + 1),
        ),
        numero: String(Number(quitarCerosIzquierda(invoice.correlativo)) + 1),
      });

    //Revisamos las configuraciones del establecimiento
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        invoice.establecimiento.id,
      );

    const configuraciones = establecimiento.configsEstablecimiento;

    try {
      //Si el establecimiento tiene la configuracion de enviar inmediatamente a sunat se enviara y notifica a los usaurios
      if (
        configuraciones.some((config) => config.enviar_inmediatamente_a_sunat)
      ) {
        const update = await this.invoiceService.updateEstadoOperacion(
          invoice.id,
          1,
        ); //estado enviando

        invoice.estado_operacion = update.estado_operacion;

        this.logger.log(
          `Cliente ${client.id} está enviando CPE ${invoice.correlativo} a sunat...`,
        );

        //notifica que esta enviando a sunat
        const __invoice = this.invoiceService.formatListInvoices(invoice);
        this.server
          .to(
            `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`,
          )
          .emit('server::newInvoice', __invoice);

        //Enviamos sunat
        const sunat = await this.invoiceService.enviarSunat(
          invoice.empresa.web_service,
          invoice.empresa.ose_enabled
            ? invoice.empresa.usu_secundario_ose_user
            : invoice.empresa.usu_secundario_user,
          invoice.empresa.ose_enabled
            ? invoice.empresa.usu_secundario_ose_password
            : invoice.empresa.usu_secundario_password,
          fileName,
          xmlSigned,
        );

        //console.log(sunat);
        const { cdrZip, codigo_sunat, mensaje_sunat, observaciones_sunat } =
          sunat.data;

        const observaciones_sunat_modified =
          (observaciones_sunat as []).length > 0
            ? observaciones_sunat.join('|')
            : null;

        //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
        const CdrZip = Buffer.from(cdrZip, 'base64');

        //Guardamos el CDR en el servidor en el directorio del cliente
        this.invoiceService.guardarArchivo(
          invoice.empresa.ruc,
          `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA`,
          `R-${fileName}.zip`,
          CdrZip,
          true,
        );

        if (codigo_sunat === 0) {
          const update = await this.invoiceService.updateEstadoOperacion(
            invoice.id,
            2,
          ); //estado enviado y aceptado
          invoice.estado_operacion = update.estado_operacion;

          await this.invoiceService.updateRptaSunat(
            invoice.id,
            codigo_sunat,
            mensaje_sunat,
            observaciones_sunat_modified,
          );

          this.logger.log(`Cliente ${client.id} - ${mensaje_sunat}.`);

          this.server
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.success',
              correlativo: invoice.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `${mensaje_sunat}`,
            });
        } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
          const update = await this.invoiceService.updateEstadoOperacion(
            invoice.id,
            3,
          ); //estado enviado y rechazado
          invoice.estado_operacion = update.estado_operacion;

          await this.invoiceService.updateRptaSunat(
            invoice.id,
            codigo_sunat,
            mensaje_sunat,
            observaciones_sunat_modified,
          );

          this.logger.error(
            `Cliente ${client.id} ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
          );

          this.server
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.failed',
              correlativo: invoice.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `El CPE#${invoice.correlativo} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
            });
        } else {
          this.logger.warn(`Cliente ${client.id} - Warning:${mensaje_sunat}.`);

          this.server
            .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
            .emit('server::notifyInvoice', {
              type: 'sunat.warn',
              correlativo: invoice.correlativo,
              time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
              message: `El CPE#${invoice.correlativo}  -  Warning:${mensaje_sunat}.`,
            });
        }

        //notifica que esta enviando a sunat
        const ___invoice = this.invoiceService.formatListInvoices(invoice);
        this.server
          .to(
            `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`,
          )
          .emit('server::newInvoice', ___invoice);
      } else {
        this.logger.log(
          `Cliente ${client.id} NO está enviando CPE ${invoice.correlativo} a sunat.`,
        );

        //Notificamos que se ha creado un CPE
        const _invoice = this.invoiceService.formatListInvoices(invoice);
        this.server
          .to(
            `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`,
          )
          .emit('server::newInvoice', _invoice);
      }
    } catch (e) {
      this.logger.error(
        `Cliente ${client.id} CPE ${invoice.correlativo} - ${e.message}.`,
      );

      //Notificamos que ocurrio un error y liberamos loading
      this.server
        .to(`room_invoices_emp-${empresaId}_est-${establecimientoId}`)
        .emit('server::getIdInvoice', {
          estado: 'error',
          loading: false,
          mensaje: 'Ocurrio un error al intentar crear el CPE.',
        });
      this.invoiceInProcess = false;
      release();
      this.exceptionHandler(client, e.message);
    }
  }

  private validarPermiso(client: Socket, user: QueryToken, permiso: string) {
    if (user) {
      const { token_of_permisos } = user;
      const findPermiso = token_of_permisos.some((item) => item === permiso);

      if (!findPermiso) {
        this.disconnect(client);
        return;
      }
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
