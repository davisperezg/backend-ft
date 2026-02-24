import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { GenerateXmlInvoiceDto } from '../dto/generate-xml-invoice.dto';
import { InvoiceService } from 'src/invoice/services/invoice.service';
import { UnidadesService } from 'src/unidades/services/unidades.service';
import { IgvsService } from 'src/igvs/services/igvs.service';
import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import {
  CODIGOS_GRAVADAS_GRATUITAS,
  CODIGOS_INAFECTAS_GRATUITAS,
  CODIGO_EXONERADA_ONEROSA,
  CODIGO_EXPORTACION,
  CODIGO_GRAVADA_ONEROSA,
  CODIGO_INAFECTA_ONEROSA,
  PORCENTAJES_IGV_DISPONIBLES,
  PORCENTAJE_IGV_GRATUITA,
  PORCENTAJE_IGV_GRAVADA,
} from 'src/lib/const/consts';
import {
  formatListInvoices,
  getPdf,
  guardarArchivo,
  numeroALetras,
  quitarCerosIzquierda,
  round,
} from 'src/lib/functions';
import { QueryTotales } from 'src/invoice/dto/query-totales';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import path from 'path';
import * as fs from 'fs';
import { QuerySunat } from 'src/invoice/dto/query-res_sunat';
import { QueryInvoiceList } from 'src/invoice/dto/query-invoice-list';
import { QueryResultInvoice } from 'src/invoice/dto/query-result-invoice';
import { docDefinitionA4 } from 'src/lib/const/pdf';
import dayjs from 'dayjs';
import { InvoiceGateway } from 'src/gateway/invoice.gateway';
import { InvoiceSocketService } from 'src/socket-session/services/invoice-socket.service';

@Injectable()
export class SunatService {
  private logger = new Logger('SunatService');

  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    private readonly unitService: UnidadesService,
    private readonly typeIgvService: IgvsService, //@Inject(forwardRef(() => InvoiceGateway))
    private readonly invoiceGateway: InvoiceGateway,
    private readonly invoiceSocketService: InvoiceSocketService,
  ) {}

  async processSendSunat(
    invoiceEntity: InvoiceEntity,
    roomId: string,
    fileName: string,
    xmlSigned: string,
    xmlUnsigned: string,
    sendMode: string,
    saveXMLs = true,
  ): Promise<QueryResultInvoice> {
    const usuario = invoiceEntity.usuario;
    let codigo_respuesta_sunat: string | null = null;
    let codigo_respuesta_sunat_int: number | null = null;
    let invoiceFormatted: QueryInvoiceList = null;

    try {
      invoiceFormatted = await formatListInvoices(
        { ...invoiceEntity, estado_operacion: 1 },
        fileName,
      );

      // Validación de documentos necesarios
      if (!fileName || !xmlSigned || !xmlUnsigned) {
        throw new HttpException(
          `No se pudo procesar el envío: documentos XML incompletos`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const messageDefaultSunat = `Tu Factura ${invoiceFormatted.serie}-${invoiceFormatted.correlativo} ha sido emitida e informada a SUNAT`;

      this.invoiceGateway.sendEstadoSunat(
        invoiceEntity.id,
        1,
        'ENVIANDO',
        messageDefaultSunat,
        true,
      );

      // Cambiamos el estado a "enviando a SUNAT"
      await this.invoiceRepository.update(
        { id: invoiceEntity.id },
        { estado_operacion: 1 },
      );

      // Notificamos al cliente que estamos enviando a SUNAT
      this.invoiceGateway.server.to(roomId).emit('server::newInvoice', {
        ...invoiceFormatted,
        estado_operacion: 1,
      });

      // Enviamos a SUNAT
      const sunat = await this.sendSunatInvoice(
        invoiceEntity,
        fileName,
        xmlSigned,
      );

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

      // Actualizar estado basado en la respuesta de SUNAT
      let nuevoEstado: number;
      let tipoNotificacion: string;
      let mensajeNotificacion: string;
      let statusSunat: string;

      // Determinar estado y mensaje según código de respuesta
      if (codigo_respuesta_sunat === 'HTTP') {
        statusSunat = 'EN ESPERA';
        nuevoEstado = 1; // Estado "enviando"
        tipoNotificacion = 'sunat.warning';
        mensajeNotificacion = messageDefaultSunat;
        this.logger.warn(
          `${usuario.username}: warning - ${
            sunat_code_int ?? 'CODE_INTERNAL'
          }:${mensaje_sunat ?? 'ERROR_INTERNAL'}.`,
        );
      } else if (sunat_code_int === 0) {
        // ACEPTADA
        statusSunat = 'ACEPTADO';
        nuevoEstado = 2; // Estado "aceptado"
        tipoNotificacion = 'sunat.success';
        mensajeNotificacion = mensaje_sunat;
        this.logger.log(`${usuario.username}: ${mensaje_sunat}`);
      } else if (sunat_code_int >= 2000 && sunat_code_int <= 3999) {
        // RECHAZADA
        statusSunat = 'RECHAZADO';
        nuevoEstado = 3; // Estado "rechazado"
        tipoNotificacion = 'sunat.failed';
        mensajeNotificacion = mensaje_sunat;
        this.logger.error(
          `${usuario.username}: ${fileName} fue rechazado por SUNAT - ${sunat_code_int}:${mensaje_sunat}`,
        );
      } else if (sunat_code_int >= 1000 && sunat_code_int <= 1999) {
        // EXCEPCIÓN (error contribuyente)
        statusSunat = 'ERROR_CONTRIBUYENTE';
        nuevoEstado = 4; // Estado "excepción"
        tipoNotificacion = 'sunat.failed';
        mensajeNotificacion = mensaje_sunat;
        this.logger.warn(
          `${usuario.username}: ${fileName} excepción por SUNAT - ${sunat_code_int}:${mensaje_sunat}`,
        );
      } else {
        // EXCEPCIÓN 0100 al 999 corregir y volver a enviar CPE
        nuevoEstado = 1; // Estado "enviando"
        statusSunat = 'ERROR_EXCEPCION';
        tipoNotificacion = 'sunat.warning';
        mensajeNotificacion = messageDefaultSunat;
        this.logger.warn(
          `${usuario.username}: warning - ${
            sunat_code_int ?? 'CODE_INTERNAL'
          }:${mensaje_sunat ?? 'ERROR_INTERNAL'}.`,
        );
      }

      // Actualizar el estado en la base de datos
      await this.invoiceRepository.update(
        { id: invoiceEntity.id },
        {
          estado_operacion: nuevoEstado,
          respuesta_sunat_codigo: codigo_respuesta_sunat,
          respuesta_sunat_descripcion: mensaje_sunat,
          observaciones_sunat: observaciones_sunat_modified,
        },
      );

      // Guardar archivos excepto si es excepción-contribuyente
      if (!(sunat_code_int >= 1000 && sunat_code_int <= 1999)) {
        //Si no guarda XML porque ya existen(handleCron)
        if (!saveXMLs) {
          // Guardar solo CDR
          if (cdrZip) {
            const cdrZipBuffer = Buffer.from(cdrZip, 'base64');
            const basePath = `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}`;
            await guardarArchivo(
              `${basePath}/RPTA`,
              `R-${fileName}.zip`,
              cdrZipBuffer,
              true,
            );
          }
        } else {
          // Guardar XML y archivos relacionados
          await this.guardarDocumentos(
            invoiceEntity,
            fileName,
            xmlUnsigned,
            xmlSigned,
            cdrZip,
          );
        }
      }

      // Actualizar el invoiceFormatted con el nuevo estado
      invoiceFormatted = await formatListInvoices(
        {
          ...invoiceEntity,
          estado_operacion: nuevoEstado,
          respuesta_sunat_codigo: codigo_respuesta_sunat,
          respuesta_sunat_descripcion: mensaje_sunat,
          observaciones_sunat: observaciones_sunat_modified,
        },
        fileName,
      );

      // Notificar al cliente sobre el resultado
      if (tipoNotificacion !== 'sunat.warning') {
        this.invoiceGateway.server.to(roomId).emit('server::notifyInvoice', {
          type: tipoNotificacion,
          correlativo: invoiceEntity.correlativo,
          time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
          message: mensajeNotificacion,
        });
      }

      // Notificar la actualización del invoice
      this.invoiceGateway.server
        .to(roomId)
        .emit('server::newInvoice', invoiceFormatted);

      // Calcular totales y formar respuesta
      const totales = this.obtenerTotalesInvoices(
        invoiceEntity.invoices_details,
      );

      this.invoiceGateway.sendEstadoSunat(
        invoiceEntity.id,
        nuevoEstado,
        statusSunat,
        mensajeNotificacion,
        false,
        sendMode,
        codigo_respuesta_sunat,
        observaciones_sunat_modified,
        invoiceFormatted.xml,
        invoiceFormatted.cdr,
        invoiceFormatted.pdfA4,
      );

      return {
        invoice: invoiceEntity,
        fileName: fileName,
        message: mensajeNotificacion,
        codigo_respuesta_sunat: codigo_respuesta_sunat,
        codigo_respuesta_sunat_int: codigo_respuesta_sunat_int,
        documento: `${invoiceEntity.tipo_doc.tipo_documento.toUpperCase()} ELECTRÓNICA`,
        serie: invoiceEntity.serie,
        correlativo: String(
          Number(quitarCerosIzquierda(invoiceEntity.correlativo)) + 1,
        ),
        correlativo_registrado: invoiceEntity.correlativo,
        total: `${invoiceEntity.tipo_moneda.simbolo} ${totales.mtoOperGravadas}`,
        xml: invoiceFormatted.xml,
        cdr: invoiceFormatted.cdr,
        pdfA4: invoiceFormatted.pdfA4,
        sendMode: sendMode,
      };
    } catch (e) {
      // En caso de error, actualizar el estado del documento
      await this.invoiceRepository.update(
        { id: invoiceEntity.id },
        {
          estado_operacion: 5, // Estado "error"
          respuesta_sunat_codigo: 'Internal Server',
          respuesta_sunat_descripcion: e.message,
        },
      );

      this.invoiceGateway.server.to(roomId).emit('server::newInvoice', {
        ...invoiceFormatted,
        estado_operacion: 5,
        respuesta_sunat_codigo: 'Internal Server',
        respuesta_sunat_descripcion: e.message,
      });

      // Notificar el error
      this.invoiceGateway.server.to(roomId).emit('server::notifyInvoice', {
        type: 'sunat.failed',
        correlativo: invoiceEntity.correlativo,
        time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
        message: `Error al enviar a SUNAT: ${e.message}`,
      });

      throw new HttpException(
        `Error al enviar a SUNAT: ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      this.invoiceSocketService.deleteSocket(invoiceEntity.id);
    }
  }

  async sendSunatInvoice(
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
        `${process.env.API_SERVICE_PHP}/invoice/send-xml`,
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
        `Error en SunatService.sendSunatInvoice - ${e.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async signXml(xmlUnsigned: string, certificado: string): Promise<string> {
    try {
      const res = await axios.post<string>(
        `${process.env.API_SERVICE_PHP}/sign/xml`,
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

  async generateXmlInvoice(
    invoice: InvoiceEntity,
    decimales = 6,
  ): Promise<GenerateXmlInvoiceDto> {
    //Validamos la existencia de los tipos de productos, unidad, etc...
    const details = await this.validarYFormatearDetalle(invoice, decimales);

    //Calculamos los totales del invoice y obtendran solo 2 decimales
    const totales = this.obtenerTotalesInvoices(details);

    //Si el producto tiene id validamos producto

    //Validamos si el producto pertenece a la empresa

    //Validamos si el producto pertenece al establecimiento

    //Validamos si el producto tiene stock
    const dataApi = {
      client: {
        tipo_doc: invoice.cliente?.tipo_entidad?.codigo ?? invoice.entidad_tipo, //ruc es 6
        num_doc: invoice.cliente?.numero_documento ?? invoice.entidad_documento, //ruc cliente
        razon_social: invoice.cliente?.entidad ?? invoice.entidad,
        direccion: invoice.cliente?.direccion ?? invoice.entidad_direccion,
      },
      company: {
        ruc: invoice.empresa.ruc,
        razon_social: invoice.empresa.razon_social,
        nombre_comercial: invoice.empresa.nombre_comercial,
        address: {
          ubigeo: invoice.establecimiento.ubigeo,
          departamento: invoice.establecimiento.departamento,
          provincia: invoice.establecimiento.provincia,
          distrito: invoice.establecimiento.distrito,
          urbanizacion: '-',
          direccion: invoice.establecimiento.direccion,
          cod_local: invoice.establecimiento.codigo,
        },
      },
      invoice: {
        ubl_version: invoice.UBLVersionID,
        fecha_vencimiento: invoice.fecha_vencimiento,
        tipo_operacion: invoice.tipo_operacion,
        tipo_doc: invoice.tipo_doc.codigo, //01 = Factura
        serie: invoice.serie,
        correlativo: invoice.correlativo,
        fecha_emision: invoice.fecha_emision,
        forma_pago: invoice.forma_pago.forma_pago, //1 = Contado; 2 = Credito
        tipo_moneda: invoice.tipo_moneda.abrstandar, //PEN
        montos: {
          oper_gravadas: invoice.mto_operaciones_gravadas,
          oper_exoneradas: invoice.mto_operaciones_exoneradas,
          oper_inafectas: invoice.mto_operaciones_inafectas,
          oper_gratuitas: invoice.mto_operaciones_gratuitas,
          oper_exportacion: invoice.mto_operaciones_exportacion,
          igv: invoice.mto_igv,
          igv_gratuitas: invoice.mto_igv_gratuitas,
          total_impuestos: totales.totalImpuestos,
          valor_venta: totales.valorVenta,
          sub_total: totales.subTotal,
          imp_venta: totales.mtoImpVenta,
        },
        details: invoice.invoices_details.reduce((acc, producto) => {
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
              cod_producto: producto.codigo,
              unidad: producto.unidad.codigo,
              descripcion: producto.descripcion,
              cantidad: producto.cantidad,
              mto_valor_unitario: mtoValorUnitario, //3decimales
              mto_valor_venta: round(mtoValorVenta),
              mto_base_igv: round(mtoBaseIgv),
              porcentaje_igv: porcentajeIgv,
              igv: round(igv),
              tip_afe_igv: producto.tipAfeIgv.codigo,
              total_impuestos: round(totalImpuestos),
              mto_precio_unitario: round(mtoPrecioUnitario),
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
              cod_producto: producto.codigo,
              unidad: producto.unidad.codigo,
              descripcion: producto.descripcion,
              cantidad: producto.cantidad,
              mto_valor_unitario: 0,
              mto_valor_venta: round(mtoValorVenta),
              mto_base_igv: round(mtoBaseIgv),
              porcentaje_igv: porcentajeIgv,
              igv: round(igv),
              tip_afe_igv: producto.tipAfeIgv.codigo,
              total_impuestos: round(totalImpuestos),
              mto_precio_unitario: 0,
              mto_valor_gratuito: mtoValorGratuito,
            };

            acc.push(objProduct);
          }

          return acc;
        }, []),
        legends: [
          {
            code: 1000, // Monto en letras - Catalog. 52
            value: numeroALetras(totales.mtoImpVenta),
          },
        ],
        observations: invoice.observaciones_invoice
          ? invoice.observaciones_invoice.split('|')
          : [],
      },
    };

    //opcionales

    //Solo enviaremos los datos necesarios a la api generar xml
    if (
      invoice.mto_operaciones_gravadas === null ||
      invoice.mto_operaciones_gravadas === 0
    ) {
      delete dataApi.invoice.montos.oper_gravadas;
    }

    if (
      invoice.mto_operaciones_exoneradas === null ||
      invoice.mto_operaciones_exoneradas === 0
    ) {
      delete dataApi.invoice.montos.oper_exoneradas;
    }

    if (
      invoice.mto_operaciones_inafectas === null ||
      invoice.mto_operaciones_inafectas === 0
    ) {
      delete dataApi.invoice.montos.oper_inafectas;
    }

    if (
      invoice.mto_operaciones_exportacion === null ||
      invoice.mto_operaciones_exportacion === 0
    ) {
      delete dataApi.invoice.montos.oper_exportacion;
    }

    if (
      invoice.mto_operaciones_gratuitas === null ||
      invoice.mto_operaciones_gratuitas === 0
    ) {
      delete dataApi.invoice.montos.oper_gratuitas;
    }

    if (invoice.mto_igv_gratuitas === null || invoice.mto_igv_gratuitas === 0) {
      delete dataApi.invoice.montos.igv_gratuitas;
    }

    if (invoice.mto_igv === null || invoice.mto_igv === 0) {
      delete dataApi.invoice.montos.igv;
    }

    //fin opcionales

    try {
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/invoice/generate-xml`,
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

  async getCdr(
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

  async generateXmlLow(
    invoice: InvoiceEntity,
    motivo: string,
    correlativoBaja: string,
  ) {
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

      const { fileName, fileNameExtension, xml: xmlUnsigned } = xmlBaja.data;

      //GUARDAMOS XML
      await guardarArchivo(
        `uploads/files/${invoice.empresa.ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/XML`,
        `${fileNameExtension}`,
        xmlUnsigned,
        true,
      );

      return {
        xmlUnsigned,
        fileName,
        fileNameExtension,
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
        `Error InvoiceService.generateXmlLow - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async generateTicketLow(
    invoice: InvoiceEntity,
    fileName: string,
    xmlSigned: string,
  ) {
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

    try {
      //GENERAMOS TICKET DE SUNAT
      const { data } = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-ticket-baja`,
        dataIdentify,
      );

      //GUARDAMOS XML FIRMADO
      //   await guardarArchivo(
      //     `uploads/files/${invoice.empresa.ruc}/${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/FIRMA`,
      //     `${fileNameExtension}`,
      //     xmlSigned,
      //     true,
      //   );

      return data;
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const message = `[${e.response.data.error?.code}]:${e.response.data.error?.message}`;
      throw new HttpException(
        `Error InvoiceService.generateTicketLow - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async sendSunatTicket(invoice: InvoiceEntity, ticket: string) {
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
        `Error sunat.sendSunatTicket - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async validarYFormatearDetalle(
    input: InvoiceEntity | any[],
    decimales: number,
  ): Promise<InvoiceDetailsEntity[]> {
    const formatearDetalle = async (
      detail: any,
    ): Promise<InvoiceDetailsEntity> => {
      // Validamos la existencia de los tipos de productos, unidad, etc.
      const unidad = await this.unitService.findUnidadByCodigo(detail.unidad);
      const tipAfeIgv = await this.typeIgvService.findTipIgvByCodigo(
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

  obtenerTotalesInvoices(productos: InvoiceDetailsEntity[]): QueryTotales {
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

  async validateCertificate(empresa: EmpresaEntity) {
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

  async validateXsdInvoice2_1(
    xmlSigned: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const url = `http://localhost:8088/api/xsd/validate/UBL-Invoice-2.1`;

    try {
      const response = await axios.post<{
        isValid: boolean;
        errors: string[];
      }>(url, xmlSigned, {
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

  async valiateXslFactura2_0_1(
    xmlSigned: string,
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
      }>(url, xmlSigned, {
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

  async validateInvoiceFactura(invoice: InvoiceEntity) {
    const username = invoice.usuario.username;
    const enviroment = invoice.empresa.modo === 0 ? 'BETA' : 'PRODUCCION';
    const empresa = invoice.empresa;

    try {
      this.invoiceGateway.sendEstadoSunat(
        invoice.id,
        0,
        'VALIDANDO',
        'Validando documento...',
        true,
      );
      // 1.- Generamos XML
      this.logger.debug(`${username}: generando XML...`);
      const xmlGenerado = await this.generateXmlInvoice(invoice);

      const { fileName, xmlUnsigned, fileNameExtension } = xmlGenerado;
      this.logger.debug(`${username}: ${fileName} XML generado!`);

      // 2.- Validamos exsistencia de certificado digital
      this.logger.debug(
        `${username}: ${fileName} validando existencia de certificado digital en ${enviroment}...`,
      );
      const certificado = await this.validateCertificate(empresa);
      this.logger.debug(
        `${username}: ${fileName} certificado digital validado!`,
      );

      this.invoiceGateway.sendEstadoSunat(
        invoice.id,
        0,
        'VALIDANDO',
        'Validando firma del documento...',
        true,
      );
      // 3.- Firmamos XML
      this.logger.debug(`${username}: ${fileName} firmando XML...`);
      const xmlSigned = await this.signXml(xmlUnsigned, certificado);
      this.logger.debug(`${username}: ${fileName} XML firmado!`);

      this.invoiceGateway.sendEstadoSunat(
        invoice.id,
        0,
        'VALIDANDO',
        'Validando estructura del documento...',
        true,
      );
      // 4.- Validamos XSD y XSL del XML firmado
      this.logger.debug(`${username}: ${fileName} validando XSD y XSL...`);
      const resultXSD = await this.validateXsdInvoice2_1(xmlSigned);
      if (!resultXSD.isValid) {
        throw new HttpException(
          JSON.stringify(resultXSD.errors, null, 2),
          HttpStatus.BAD_REQUEST,
        );
      }

      const resultXSL = await this.valiateXslFactura2_0_1(
        xmlSigned,
        fileNameExtension,
      );
      if (!resultXSL.isValid) {
        throw new HttpException(
          JSON.stringify(resultXSL.errors, null, 2),
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.debug(`${username}: ${fileName} XSD y XSL validados!`);

      return {
        fileName,
        xmlSigned,
        xmlUnsigned,
      };
    } catch (e) {
      const roomId = `room_invoices_emp-${invoice.empresa.id}_est-${invoice.establecimiento.id}`;

      const invoiceFormatted = await formatListInvoices(
        {
          ...invoice,
          estado_operacion: 0,
        },
        null,
      );

      this.invoiceGateway.server
        .to(roomId)
        .emit('server::newInvoice', invoiceFormatted);

      throw new HttpException(
        `Error en InvoiceService.validateInvoiceFactura - ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  getHashXmlSigned(xmlSigned: string) {
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

  // Método auxiliar para guardar documentos
  private async guardarDocumentos(
    invoiceEntity: InvoiceEntity,
    fileName: string,
    xmlUnsigned: string,
    xmlSigned: string,
    cdrZip?: string,
  ): Promise<void> {
    const basePath = `uploads/files/${invoiceEntity.empresa.ruc}/${invoiceEntity.establecimiento.codigo}/${invoiceEntity.tipo_doc.tipo_documento}`;

    // Guardar XML sin firmar
    await guardarArchivo(
      `${basePath}/XML`,
      `${fileName}.xml`,
      xmlUnsigned,
      true,
    );

    // Guardar XML firmado
    await guardarArchivo(
      `${basePath}/FIRMA`,
      `${fileName}.xml`,
      xmlSigned,
      true,
    );

    // Guardar CDR si existe
    if (cdrZip) {
      const cdrZipBuffer = Buffer.from(cdrZip, 'base64');
      await guardarArchivo(
        `${basePath}/RPTA`,
        `R-${fileName}.zip`,
        cdrZipBuffer,
        true,
      );
    }

    // Crear y guardar PDF
    const pdf = await getPdf(docDefinitionA4);
    await guardarArchivo(`${basePath}/PDF`, `${fileName}.pdf`, pdf, true);
  }
}
