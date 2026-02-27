import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { InvoiceService } from '../services/invoice.service';
import path from 'path';
import { fileExists, formatListInvoices, withRetry } from 'src/lib/functions';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js'; // Importamos el parseador de xml2js
import { ConfiguracionesServices } from 'src/configuraciones/services/configuraciones.service';
import { InvoiceGateway } from 'src/gateway/invoice.gateway';
import { Queue } from 'bull';
import { QueryInvoiceList } from '../dto/query-invoice-list';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class InvoiceScheduledJobs {
  private logger = new Logger('InvoiceScheduledJobs');

  constructor(
    private readonly establecimientoService: EstablecimientoService,
    private readonly invoiceService: InvoiceService,
    private readonly configuracionesService: ConfiguracionesServices,
    private readonly invoiceGateway: InvoiceGateway,
    @InjectQueue('job-sunat-submission-scheduled')
    private readonly sunatQueue: Queue,
  ) {}

  //Se ejecutara esta tarea todos los dias a las 1am -> enviara todos cpes pendientes a sunat
  //@Cron('0 0,20,40,59 2 * * *')
  @Cron('0 0,20,40,59 2 * * *')
  async handleCron() {
    this.logger.debug(
      'INICIANDO ENVIO DE COMPROBANTES A SUNAT PROGRAMADO MEDIANTE CRON...',
    );
    try {
      // Lista todos los establecimientos con sus respectivas empresas
      const establecimientos =
        await this.establecimientoService.findAllEstablecimientos();

      // Transformamos la lista de establecimientos para obtener solo las empresas y establecimientos activos
      const estMaped = (
        await Promise.all(
          establecimientos.map(async (est) => {
            if (est.estado && est.empresa.estado) {
              const config =
                await this.configuracionesService.getConfigEstablecimiento(
                  est.id,
                );

              if (config) {
                return {
                  companyId: est.empresa.id,
                  companyName: `${est.empresa.ruc} - ${est.empresa.razon_social}`,
                  establishmentId: est.id,
                  establishmentCode: est.codigo,
                  establishmentStatus: est.estado,
                  establishmentHasJob: config.envio_sunat_job,
                  establishmentModeSend: config.envio_sunat_modo,
                };
              }
            }

            return undefined;
          }),
        )
      ).filter(Boolean);

      // Recorremos cada establecimiento para enviar los comprobantes a sunat
      for (let index = 0; index < (await estMaped).length; index++) {
        const item = (await estMaped)[index];
        const companyId = item.companyId;
        const establishmentId = item.establishmentId;
        const establishmentModeSend = item.establishmentModeSend;
        const roomId = `room_invoices_emp-${companyId}_est-${establishmentId}`;

        // Validamos si el establecimiento tiene la configuracion de enviar inmediatamente job a sunat
        if (item.establishmentHasJob) {
          const invoices = await this.invoiceService.findAllInvoicesCron(
            companyId,
            establishmentId,
            0,
            EnvioSunatModo.PROGRAMADO,
          );

          //Si no hay comprobantes pendientes se informa
          if (invoices.length === 0) {
            this.logger.warn(
              `No se encontraron comprobantes pendientes para enviar a sunat en el establecimiento ${item.establishmentCode} de la empresa ${item.companyName}.`,
            );

            continue;
          }

          for (let indexIvs = 0; indexIvs < invoices.length; indexIvs++) {
            const invoice = invoices[indexIvs];

            // Todos los cpes con estado 1 se enviaran a sunat para que actualicen a estado 2
            const ruc = invoice.empresa.ruc;
            const tipoDoc = invoice.tipo_doc.codigo;
            const serie = invoice.serie;
            const correlativo = invoice.correlativo;
            const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;

            // Para enviar cada cpe buscamos y leermos el archivo xml firmado en la carpeta uploads
            const pathXmlSigned = path.join(
              process.cwd(),
              `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/FIRMA/${fileName}.xml`,
            );

            const pathXmlUnsigned = path.join(
              process.cwd(),
              `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/XML/${fileName}.xml`,
            );

            let _invoice: QueryInvoiceList | null = null;

            // Si existe el xml firmado se envia a sunat
            if (
              (await fileExists(pathXmlSigned)) &&
              (await fileExists(pathXmlUnsigned))
            ) {
              const pathDirCDR = path.join(
                process.cwd(),
                `uploads/files/${ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/RPTA/R-${fileName}.zip`,
              );

              // Si no existe un archivo CDR se procede a enviar a sunat
              if (!(await fileExists(pathDirCDR))) {
                try {
                  const xmlSigned = await fs.promises.readFile(
                    pathXmlSigned,
                    'utf8',
                  );
                  const xmlUnsigned = await fs.promises.readFile(
                    pathXmlUnsigned,
                    'utf8',
                  );

                  await this.sunatQueue.add(
                    'submitSunatScheduled',
                    {
                      invoiceId: invoice.id,
                      roomId: roomId,
                      fileName: fileName,
                      xmlSigned: xmlSigned,
                      xmlUnsigned: xmlUnsigned,
                      sendMode: establishmentModeSend,
                      sendModeDoc: EnvioSunatModo.PROGRAMADO,
                      saveXMLs: false, //no crear XML porque ya existen, crear solo CDR
                    },
                    {
                      attempts: 3,
                      backoff: {
                        type: 'exponential',
                        delay: 5000,
                      },
                      removeOnComplete: true,
                      removeOnFail: false,
                      delay: 0,
                    },
                  );
                } catch (e) {
                  const mensaje = e.message;

                  this.logger.warn(
                    `ServerResponse:Catch - ${companyId}-${establishmentId}#${fileName} - Warning:${mensaje}.`,
                  );
                }
              }
              //Si existe CDR y su estado sigue en 1 se procede actualizar invoices
              else {
                // Leemos el archivo ZIP
                const zip = new AdmZip(pathDirCDR);

                // Listamos los archivos dentro del ZIP
                const zipEntries = zip.getEntries();

                // Buscamos el archivo XML por nombre
                const xmlEntry = zipEntries.find(
                  (entry) => entry.entryName === `R-${fileName}.xml`,
                );

                if (!xmlEntry) {
                  this.logger.debug(
                    `El archivo XML ${fileName} no se encuentra en el ZIP`,
                  );
                } else {
                  // Extraemos y leemos el contenido del archivo XML
                  const xmlContent = xmlEntry.getData().toString('utf8');

                  // Parseamos el XML para convertirlo en un objeto JS
                  const parsedXml = await parseStringPromise(xmlContent, {
                    tagNameProcessors: [(name) => name.replace(/^.*:/, '')], // Ignoramos los prefijos de namespaces
                    explicitArray: false, // Para que no ponga los valores en arrays si no es necesario
                  });

                  const mensaje_sunat =
                    parsedXml.ApplicationResponse?.DocumentResponse?.Response
                      ?.Description ?? null;

                  const codigo_sunat =
                    parsedXml.ApplicationResponse?.DocumentResponse?.Response
                      ?.ResponseCode ?? null;

                  const observaciones_sunat =
                    parsedXml.ApplicationResponse?.Note ?? [];

                  const observaciones_sunat_modified =
                    observaciones_sunat.length > 0
                      ? observaciones_sunat.join('|')
                      : null;

                  if (Number(codigo_sunat) === 0) {
                    const updated =
                      await this.invoiceService.updateInvoiceFields(
                        invoice.id,
                        { estado_operacion: 2 },
                      ); //cambiamos a aceptado

                    invoice.estado_operacion = updated.estado_operacion;

                    await this.invoiceService.updateInvoiceFields(invoice.id, {
                      respuesta_sunat_codigo: codigo_sunat,
                      respuesta_sunat_descripcion: mensaje_sunat,
                      observaciones_sunat: observaciones_sunat_modified,
                    });

                    this.logger.log(
                      `ServerResponse:CDRExisting - ${mensaje_sunat}.`,
                    );

                    _invoice = await formatListInvoices(
                      {
                        ...invoice,
                        estado_operacion: 2,
                        respuesta_sunat_codigo: codigo_sunat,
                        respuesta_sunat_descripcion: mensaje_sunat,
                        observaciones_sunat: observaciones_sunat_modified,
                      },
                      fileName,
                    );

                    //Notificamos al cliente que se acepto a sunat
                    this.invoiceGateway.server
                      .to(
                        `room_invoices_emp-${companyId}_est-${establishmentId}`,
                      )
                      .emit('server::newInvoice', _invoice);
                  } else if (
                    Number(codigo_sunat) >= 2000 &&
                    Number(codigo_sunat) <= 3999
                  ) {
                    const updated =
                      await this.invoiceService.updateInvoiceFields(
                        invoice.id,
                        { estado_operacion: 3 },
                      ); //cambiamos a rechazado

                    await this.invoiceService.updateInvoiceFields(invoice.id, {
                      respuesta_sunat_codigo: codigo_sunat,
                      respuesta_sunat_descripcion: mensaje_sunat,
                      observaciones_sunat: observaciones_sunat_modified,
                    });

                    invoice.estado_operacion = updated.estado_operacion;

                    this.logger.error(
                      `ServerResponse:CDRExisting ha enviado CPE ${invoice.correlativo} a SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                    );

                    _invoice = await formatListInvoices(
                      {
                        ...invoice,
                        estado_operacion: 3,
                        respuesta_sunat_codigo: codigo_sunat,
                        respuesta_sunat_descripcion: mensaje_sunat,
                        observaciones_sunat: observaciones_sunat_modified,
                      },
                      fileName,
                    );

                    //Notificamos al cliente que se acepto a sunat
                    this.invoiceGateway.server
                      .to(
                        `room_invoices_emp-${companyId}_est-${establishmentId}`,
                      )
                      .emit('server::newInvoice', _invoice);
                  } else {
                    this.logger.warn(
                      `ServerResponse:CDRExisting - Warning:${mensaje_sunat}.`,
                    );
                  }
                }
              }
            } else {
              //Si se encuentran doc con estando pendiente y no existen xml firmados para el envio a SUNAT
              await this.sunatQueue.add(
                'submitSunatScheduledWithValidation',
                {
                  invoiceId: invoice.id,
                  roomId: roomId,
                  sendMode: establishmentModeSend,
                  sendModeDoc: EnvioSunatModo.PROGRAMADO,
                },
                {
                  attempts: 3,
                  backoff: {
                    type: 'exponential',
                    delay: 5000,
                  },
                  removeOnComplete: true,
                  removeOnFail: false,
                  delay: 0,
                },
              );
            }
          }
        }
      }
    } catch (e) {
      this.logger.error(
        'OCURRIO UN ERROR EN EL PROCESO DE CRON PROGRAMADO.',
        e.message,
      );
    } finally {
      this.logger.debug(
        'PROCESO DE ENVIO A SUNAT PROGRAMADO MEDIANTE CRON A FINALIZADO.',
      );
    }
  }
}
