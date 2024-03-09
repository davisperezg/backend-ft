import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { SignedXml, FileKeyInfo } from 'xml-crypto';
//const pem = require('pem').DER2PEM();
//import * as AdmZip from 'adm-zip';
import * as pem from 'pem';
import axios, { AxiosResponse } from 'axios';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { QueryToken } from 'src/auth/dto/queryToken';
import PdfPrinter from 'pdfmake';
import path from 'path';
import { docDefinitionA4 } from 'src/lib/const/pdf';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { exec, execSync } from 'child_process';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  completarConCeros,
  convertirDecimales,
  numeroALetras,
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
import { Request } from 'express';
import { URL_STATIC } from 'src/lib/const/consts';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceService {
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
  ) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('America/Lima'); // Establecer el huso horario de Perú como predeterminado
  }

  async createInvoice(invoice: CreateInvoiceDto, user: QueryToken) {
    const { tokenEntityFull, token_of_permisos } = user;
    const { empresas } = tokenEntityFull;

    //Validamos empresa emisora
    const empresa = (await this.empresaService.findOneEmpresaById(
      invoice.empresa,
      true,
    )) as EmpresaEntity;

    //Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
    const existEmpresa = empresas.find((emp) => emp.id === empresa.id);

    if (!existEmpresa) {
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

    //Validamos si el establecimiento emisor pertenece a las empresas asignadas al usuario
    const existEstablecimiento = existEmpresa.establecimientos.find(
      (est) => est.id === invoice.establecimiento,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'No puedes emitir facturas para este establecimiento',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos si el tipo de documento del body es permitido en el establecimiento
    const tipDoc = (existEstablecimiento as any).documentos.find(
      (doc) => doc.codigo === invoice.tipo_documento,
    );

    if (!tipDoc) {
      throw new HttpException(
        'No puedes emitir este tipo de documento',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Obtenmos serie del establecimiento
    const serie = tipDoc.series.find(
      (item: any) => item.serie === invoice.serie,
    );

    //No se puede emitir un cpe con un correlativo menor o mayor al actual
    // if (
    //   Number(invoice.numero) < Number(serie.numero) ||
    //   Number(invoice.numero) > Number(serie.numero)
    // ) {
    //   throw new HttpException(
    //     'El correlativo ingresado ya fue utilizada o es mayor a la actual serie del establecimiento.',
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    //Validar que correlativo no se repita con nuestro cpe en la db
    const existInvoice = await this.findOneInvoice(
      invoice.serie,
      serie.numeroConCeros,
      empresa.id,
      establecimiento.id,
    );

    //Si ya existe una invoice es porque el correlativo, empresa y establecimiento
    //son los mismos datos por lo tanto para seguir con la transaccion debemos
    //actualizar el correlativo de la serie
    if (existInvoice) {
      throw new HttpException(
        'Ya existe un cpe con el mismo número de serie.',
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

    let result: {
      invoice: InvoiceEntity;
      fileName: string;
      xmlSigned: string;
    } = null;

    try {
      result = await this.dataSource.transaction(async (entityManager) => {
        let clienteEntity: EntidadEntity = null;

        //Validamos si tiene el permisos de canCreate_clientes
        const existPermisoRegCliente = token_of_permisos.some(
          (item) => item === 'canCreate_clientes',
        );

        const usuario = await this.userRepository.findOne({
          where: {
            _id: String(user.tokenEntityFull._id),
          },
        });

        if (existPermisoRegCliente) {
          const clientExist = await this.clienteRepository.findOne({
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
          //Si existe cliente almacenamos entidad
          if (clientExist) {
            clienteEntity = clientExist;
          } else {
            //Si no existe el cliente creamos y almacenamos
            const clienteObj = this.clienteRepository.create({
              tipo_entidad: tipoEntidad,
              entidad: invoice.cliente,
              direccion: invoice.direccion,
              numero_documento: invoice.ruc,
              usuario,
              empresa,
            });

            clienteEntity = await entityManager.save(EntidadEntity, clienteObj);
          }
        }

        //Obj para invoice details
        const productos = invoice.productos.map(async (producto) => {
          const unidad = await this.unidadService.findUnidadByCodigo(
            producto.unidad,
          );
          const tipAfeIgv = await this.tipoIgvService.findTipIgvByCodigo(
            producto.tipAfeIgv,
          );
          const item: InvoiceDetailsEntity = {
            unidad, // Unidad - Catalog. 03
            tipAfeIgv, // Gravado Op. Onerosa - Catalog. 07
            codigo: producto.codigo,
            cantidad: producto.cantidad,
            producto: producto.descripcion,
            mtoValorUnitario: convertirDecimales(producto.mtoValorUnitario, 3),
            mtoBaseIgv: convertirDecimales(producto.mtoBaseIgv, 3),
            porcentajeIgv: producto.porcentajeIgv, // 18%
            igv: convertirDecimales(producto.igv, 3),
            totalImpuestos: convertirDecimales(producto.totalImpuestos, 3), // Suma de impuestos en el detalle
            mtoValorVenta: convertirDecimales(producto.mtoValorVenta, 3),
            mtoPrecioUnitario: convertirDecimales(
              producto.mtoPrecioUnitario,
              3,
            ),
          };

          if (producto.mtoValorGratuito) {
            item['mtoValorGratuito'] = convertirDecimales(
              producto.mtoValorGratuito,
              3,
            );
          }

          return item;
        });

        const todosProductos = await Promise.all(productos);

        const calc = this.obtenerOperacionesInvoice(todosProductos);

        //Obj para invoice
        const invoiceObj = this.invoiceRepository.create({
          tipo_operacion: invoice.tipo_operacion,
          tipo_doc: tipoDocumento,
          serie: invoice.serie,
          correlativo: serie.numeroConCeros,
          fecha_emision: invoice.fecha_emision,
          fecha_vencimiento: invoice.fecha_vencimiento,
          forma_pago: formaPago,
          tipo_moneda: tipoMoneda,
          empresa,
          establecimiento,
          usuario,
          cliente: clienteEntity,
          mto_operaciones_gravadas: calc.valorVentaGravadas,
          mto_operaciones_exoneradas: calc.valorVentaExoneradas,
          mto_operaciones_inafectas: calc.valorVentaInafectas,
          mto_operaciones_exportacion: calc.valorVentaExportaciones,
          mto_operaciones_gratuitas: calc.valorVentaGratuitas,
          mto_igv: calc.totalImpuestosGravadas,
          mto_igv_gratuitas: calc.totalImpuestosGratuitas,
          porcentaje_igv: 0.18,
          entidad: existPermisoRegCliente ? null : invoice.cliente,
          entidad_tipo: existPermisoRegCliente ? null : invoice.tipo_entidad,
          entidad_documento: existPermisoRegCliente ? null : invoice.ruc,
          entidad_direccion: existPermisoRegCliente ? null : invoice.direccion,
        });

        //GUardamos invoice
        const invoiceResult = await entityManager.save(
          InvoiceEntity,
          invoiceObj,
        );

        console.log(await this.findOneInvoice('F003', '00000001', 1, 4));

        for (let index = 0; index < todosProductos.length; index++) {
          const producto = todosProductos[index];
          //Creamos el detalle del invoice
          const objDetail = this.invoiceDetailsRepository.create({
            ...producto,
            invoice: invoiceResult,
          });
          //Guardamos detalle del invoice
          await entityManager.save(InvoiceDetailsEntity, objDetail);
        }

        //console.log(invoiceResult);
        const genXML = await this.generarXML(
          invoiceResult,
          invoiceResult.empresa,
          invoiceResult.establecimiento,
          calc,
          todosProductos,
        );

        const { xml, fileName } = genXML;

        //Guardamos el XML en el directorio del cliente
        this.guardarArchivo(
          invoiceResult.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/XML`,
          `${fileName}.xml`,
          xml,
          true,
        );

        const certificado = this.validarCertificado(invoiceResult);

        //Firmar XML de nuestra api en PHP
        const xmlSigned = await this.firmar(xml, certificado);

        //Guardamos el XML Firmado en el directorio del cliente
        const pathXML = this.guardarArchivo(
          invoiceResult.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/FIRMA`,
          `${fileName}.xml`,
          xmlSigned,
          true,
        );

        //Creamos el pdf A4
        const pathPDFA4 = this.getPdf(
          invoiceResult.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/PDF/A4`,
          fileName,
          docDefinitionA4,
        );

        //Actualizamos serie
        await entityManager.save(SeriesEntity, {
          ...serie,
          numero: String(Number(serie.numero) + 1),
        });

        return {
          invoice: invoiceResult,
          fileName,
          xmlSigned,
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al intentar crear CPE InvoiceService.create. ${e.response}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;

    //Enviamos a Sunat
    // const sunat = await this.enviarSunat(
    //   empresa.web_service,
    //   empresa.ose_enabled
    //     ? empresa.usu_secundario_ose_user
    //     : empresa.usu_secundario_user,
    //   empresa.ose_enabled
    //     ? empresa.usu_secundario_ose_password
    //     : empresa.usu_secundario_password,
    //   fileName,
    //   xmlSigned,
    // );

    // const { cdrZip, ...restoSunat } = sunat;

    // //Decodificamos el CDR en base64(respuesta de sunat)
    // const CdrZip = Buffer.from(cdrZip, 'base64');

    // //Guardamos el CDR en el directorio del cliente
    // const pathCDR = this.guardarArchivo(
    //   empresa.ruc,
    //   `facturas/RPTA`,
    //   `R-${fileName}.zip`,
    //   CdrZip,
    //   true,
    // );

    // return {
    //   ...restoSunat,
    //   ruta_xml: pathXML.replace(/\\/g, '/'),
    //   ruta_cdr: pathCDR.replace(/\\/g, '/'),
    //   ruta_a4pdf: pathPDFA4.replace(/\\/g, '/'),
    //   xml_hash: this.obtenerHashXMLFirmado(xmlSigned),
    // };
  }

  async updateRptaSunatAnulacion(
    idInvoice: number,
    rptaCod: string,
    rptaDesc: string,
    rptaObs: string,
  ) {
    try {
      await this.invoiceRepository.update(idInvoice, {
        respuesta_anulacion_codigo: rptaCod,
        respuesta_anulacion_descripcion: rptaDesc,
        observaciones: rptaObs,
      });

      return this.invoiceRepository.findOne({ where: { id: idInvoice } });
    } catch (e) {
      throw new HttpException(
        'Error al actualizar el estado de la operación',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateRptaSunat(
    idInvoice: number,
    rptaCod: string,
    rptaDesc: string,
    rptaObs = '',
  ) {
    try {
      await this.invoiceRepository.update(idInvoice, {
        respuesta_sunat_codigo: rptaCod,
        respuesta_sunat_descripcion: rptaDesc,
        observaciones: rptaObs,
      });

      return this.invoiceRepository.findOne({ where: { id: idInvoice } });
    } catch (e) {
      throw new HttpException(
        'Error al actualizar el estado de la operación',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateEstadoOperacion(idInvoice: number, estado: number) {
    try {
      await this.invoiceRepository.update(idInvoice, {
        estado_operacion: estado,
      });

      return this.invoiceRepository.findOne({ where: { id: idInvoice } });
    } catch (e) {
      throw new HttpException(
        'Error al actualizar el estado de la operación',
        HttpStatus.BAD_REQUEST,
      );
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

  async generarXML(
    invoice: InvoiceEntity,
    empresa: EmpresaEntity,
    establecimiento: EstablecimientoEntity,
    calc: any,
    todosProductos: any,
  ) {
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
      productos: todosProductos.map((producto) => {
        return {
          ...producto,
          unidad: producto.unidad.codigo,
          tipAfeIgv: producto.tipAfeIgv.codigo,
        };
      }),
      MtoOperGravadas: invoice.mto_operaciones_gravadas,
      MtoIGV: invoice.mto_igv,
      TotalImpuestos: calc.totalImpuestos,
      ValorVenta: calc.valorVenta,
      SubTotal: calc.SubTotal,
      MtoImpVenta: calc.MtoImpVenta,
      LegendValue: calc.Legend,
      LegendCode: 1000, // Monto en letras - Catalog. 52
      MtoOperExoneradas: invoice.mto_operaciones_exoneradas,
      MtoOperInafectas: invoice.mto_operaciones_inafectas,
      MtoOperExportacion: invoice.mto_operaciones_exportacion,
      MtoOperGratuitas: invoice.mto_operaciones_gratuitas,
      MtoIGVGratuitas: invoice.mto_igv_gratuitas,
      //observaciones: invoice.observaciones,
      fecha_vencimiento: invoice.fecha_vencimiento,
    };
    //opcionales
    // if (invoice.fecha_vencimiento) {
    //   data['fecha_vencimiento'] = invoice.fecha_vencimiento;
    // }

    // if (invoice.observaciones && invoice.observaciones.length > 0) {
    //   data['observaciones'] = invoice.observaciones;
    // }
    //fin opcionales

    try {
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-xml`,
        dataApi,
      );

      const { xml, fileName: fileNameXML } = res.data;
      const fileName = fileNameXML.replace('.xml', '');

      return {
        xml,
        fileName,
      };
    } catch (e) {
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.generarXML ${
          e.response?.data?.message ?? 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  validarCertificado(invoice: InvoiceEntity) {
    //Verificamos si el cliente esta en modo beta o produccion
    const certFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/${
        invoice.empresa.modo === 0
          ? 'prueba/certificado_beta.pfx'
          : `produccion/${invoice.empresa.ruc}/${invoice.empresa.cert}`
      }`,
    );

    //Generamos el certificado.pem para firmar
    const pemFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/${
        invoice.empresa.modo === 0
          ? 'prueba/certificado_beta.pem'
          : `produccion/${invoice.empresa.ruc}/${invoice.empresa.fieldname_cert}.pem`
      }`,
    );

    return this.convertToPem(
      certFilePath,
      pemFilePath,
      invoice.empresa.cert_password,
    );
  }

  getPdf(
    ruc: string,
    ruta: string,
    nombreArchivo: string,
    docDefinition: TDocumentDefinitions,
  ) {
    const pathDir = path.join(process.cwd(), `uploads/files/${ruc}/${ruta}`);
    const existDir = fs.existsSync(pathDir);

    //Config PDF
    const fonts = {
      Roboto: {
        normal: path.join(process.cwd(), 'public/fonts/Roboto-Regular.ttf'),
        bold: path.join(process.cwd(), 'public/fonts/Roboto-Medium.ttf'),
        italics: path.join(process.cwd(), 'public/fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(
          process.cwd(),
          'public/fonts/Roboto-MediumItalic.ttf',
        ),
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const stream = fs.createWriteStream(`${pathDir}/${nombreArchivo}.pdf`);

    if (!existDir) {
      console.log('Directorio pdf creado');
      fs.mkdirSync(pathDir, { recursive: true });
    }

    pdfDoc.pipe(stream);
    pdfDoc.end();

    return `${pathDir}/${nombreArchivo}.pdf`;
  }

  convertToPem(ubicacion: string, destino: string, password: string) {
    try {
      const command = `openssl pkcs12 -in ${ubicacion} -out ${destino} -nodes -passin pass:${password}`;
      execSync(command);

      return destino;
    } catch (error) {
      throw new HttpException(
        'Error al obtener el certificado del usuario: InvoiceService.convertToPem',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async firmar(xml: string, certificado: string): Promise<string> {
    try {
      const xmlSigned = await axios.post(
        `${process.env.API_SERVICE_PHP}/sign`,
        {
          xml,
          certificado,
        },
      );

      return xmlSigned.data;
    } catch (e) {
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.firmar - ${
          e.response?.data?.message ?? 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async enviarSunat(
    urlService: string,
    usuario: string,
    contrasenia: string,
    fileName: string,
    contentFile: string,
  ) {
    try {
      return await axios.post(`${process.env.API_SERVICE_PHP}/sendSunat`, {
        urlService,
        usuario,
        contrasenia,
        fileName,
        contentFile,
      });

      // return {
      //   ...sunat.data,
      //   observaciones_sunat: this.quitarComillaDoble(
      //     sunat.data.observaciones_sunat,
      //   ),
      //};
    } catch (e) {
      const message = `[${e.response.data.error.code}]:${e.response.data.error.message}`;
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.enviarSunat - CPE#${fileName} - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async findOneInvoice(
    serie: string,
    numero: string,
    empresa: number,
    establecimiento: number,
  ) {
    try {
      return await this.invoiceRepository.findOne({
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
          serie: serie,
          correlativo: numero,
          empresa: {
            id: empresa,
          },
          establecimiento: {
            id: establecimiento,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar la factura',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async finAllInvoices(idEmpresa: number, idEstablecimiento: number) {
    try {
      const invoices = await this.invoiceRepository.find({
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
      });

      const urlStatic = this.configService.get<string>('URL_FILES_STATIC');

      return invoices
        .map((invoice) => {
          const { CustomizationID, UBLVersionID, ...rest } = invoice;
          const ruc = invoice.empresa.ruc;
          const tipoDoc = invoice.tipo_doc.codigo;
          const nomDoc = invoice.tipo_doc.tipo_documento;
          const serie = invoice.serie;
          const correlativo = invoice.correlativo;
          const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
          const establecimiento = `${invoice.establecimiento.codigo}`;
          return {
            ...rest,
            // empresa: {
            //   id: invoice.empresa.id,
            //   ruc: invoice.empresa.ruc,
            //   razon_social: invoice.empresa.razon_social,
            //   nombre_comercial: invoice.empresa.nombre_comercial,
            //   estado: invoice.empresa.estado,
            //   modo: invoice.empresa.modo,
            // },
            establecimiento: {
              id: invoice.establecimiento.id,
              codigo: invoice.establecimiento.codigo,
              denominacion: invoice.establecimiento.denominacion,
              estado: invoice.establecimiento.estado,
            },
            xmlSigned: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`,
            pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/${fileName}.pdf`,
            cdr: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`,
            xml: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/XML/${fileName}.xml`,
            usuario: invoice.usuario.nombres + ' ' + invoice.usuario.apellidos,
            moneda: invoice.tipo_moneda,
            fecha_registro: dayjs(invoice.createdAt).format(
              'DD-MM-YYYY·HH:mm:ss',
            ),
            fecha_emision: dayjs(invoice.fecha_emision).format(
              'DD-MM-YYYY·HH:mm:ss',
            ),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (e) {
      throw new HttpException(
        'Error al buscar los cpes',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  guardarArchivo(
    ruc: string,
    ruta: string,
    archivo: string,
    dataArchivo: string | Buffer,
    buffer?: boolean,
  ) {
    const pathDir = path.join(process.cwd(), `uploads/files/${ruc}/${ruta}`);
    const existDir = fs.existsSync(pathDir);

    if (!existDir) {
      //Creamos directorio
      try {
        fs.mkdirSync(pathDir, { recursive: true });
      } catch (e) {
        throw new HttpException(
          'Error al crear directorio',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    try {
      //Agregamos el archivo al directorio
      fs.writeFileSync(
        `${pathDir}/${archivo}`,
        buffer ? dataArchivo : fs.readFileSync(dataArchivo),
      );
    } catch (e) {
      throw new HttpException(
        `Error al leer el archivo path_${archivo} o no existe`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return `${pathDir}/${archivo}`;
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

  quitarComillaDoble(array: string[]) {
    return array.map((a: string) => a.replace(/"/g, ''));
  }

  // createZip(xmlSigned: Buffer): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     const zip = new AdmZip();
  //     zip.addFile('10481211641-03-B001-8.xml', Buffer.from(xmlSigned));
  //     const zipFileName = '10481211641-03-B001-8.zip';
  //     zip.writeZip(zipFileName, (error) => {
  //       if (error) {
  //         reject(error);
  //       } else {
  //         resolve(zipFileName);
  //       }
  //     });
  //   });
  // }

  obtenerClavePublica(certificate: string) {
    const regex = /-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s;
    const match = certificate.match(regex);

    if (match && match.length > 1) {
      return match[1].replace(/\s/g, '');
    } else {
      return null;
    }
  }

  obtenerOperacionesInvoice(productos: InvoiceDetailsEntity[]) {
    //buscamos todas las operaciones gravadas
    const operacionesGravadas = productos.filter(
      (producto) => producto.tipAfeIgv.codigo === '10',
    );

    //buscamos todas las operaciones exoneradas
    const operacionesExoneradas = productos.filter(
      (producto) => producto.tipAfeIgv.codigo === '20',
    );

    //buscamos todas las operaciones inafectas
    const operacionesInafectas = productos.filter(
      (producto) => producto.tipAfeIgv.codigo === '30',
    );

    //buscamos todas las operaciones exportacion
    const operacionesExportacion = productos.filter(
      (producto) => producto.tipAfeIgv.codigo === '40',
    );

    //buscamos todas las operaciones gratuitas
    const operacionesGratuitas = productos.filter(
      (producto) =>
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
        producto.tipAfeIgv.codigo === '37',
    );

    //Sumar igv de las operaciones gravadas
    const totalImpuestosGravadas = operacionesGravadas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.totalImpuestos)),
      0,
    );

    //Sumar igv de las operaciones gratuitas
    const totalImpuestosGratuitas = operacionesGratuitas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.totalImpuestos)),
      0,
    );

    //Sumar total de impuestos de las operaciones gravadas IGV + ISC + OTH
    const totalImpuestos = operacionesGravadas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.totalImpuestos)),
      0,
    );

    //Sumar valor de venta de las operaciones gravadas
    const valorVentaGravadas = operacionesGravadas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.mtoValorVenta)),
      0,
    );

    //Sumar valor de venta de las operaciones inafectas
    const valorVentaInafectas = operacionesInafectas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.mtoValorVenta)),
      0,
    );

    //Sumar valor de venta de las operaciones exoneradas
    const valorVentaExoneradas = operacionesExoneradas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.mtoValorVenta)),
      0,
    );

    //Sumar valor de ventas de las operaciones exportaciones
    const valorVentaExportaciones = operacionesExportacion.reduce(
      (acc, producto) => acc + parseFloat(String(producto.mtoValorVenta)),
      0,
    );

    //Sumar valor de ventas de las operaciones gratuitas
    const valorVentaGratuitas = operacionesGratuitas.reduce(
      (acc, producto) => acc + parseFloat(String(producto.mtoValorVenta)),
      0,
    );

    //Sumar todas las ventas de las operaciones
    const valorVenta =
      valorVentaGravadas +
      valorVentaInafectas +
      valorVentaExoneradas +
      valorVentaExportaciones;

    //Sumar el total de ventas + impuestos
    const SubTotal = valorVenta + totalImpuestos;

    //Sumar MtoImpVenta
    const MtoImpVenta = SubTotal;

    //Leyend
    const Legend = numeroALetras(String(MtoImpVenta), 'SOLES');

    return {
      valorVenta,
      valorVentaGravadas,
      // valorVentaInafectas,
      // valorVentaExoneradas,
      // valorVentaExportaciones,
      // valorVentaGratuitas,
      totalImpuestosGravadas,
      //totalImpuestosGratuitas,
      totalImpuestos,
      SubTotal,
      MtoImpVenta,
      Legend,
      valorVentaExoneradas:
        operacionesExoneradas.length > 0 ? valorVentaExoneradas : null,
      valorVentaInafectas:
        operacionesInafectas.length > 0 ? valorVentaInafectas : null,
      valorVentaExportaciones:
        operacionesExportacion.length > 0 ? valorVentaExportaciones : null,
      valorVentaGratuitas:
        operacionesGratuitas.length > 0 ? valorVentaGratuitas : null,
      totalImpuestosGratuitas:
        operacionesGratuitas.length > 0 ? totalImpuestosGratuitas : null,
    };
  }
}
