import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { SignedXml, FileKeyInfo } from 'xml-crypto';
//const pem = require('pem').DER2PEM();
//import * as AdmZip from 'adm-zip';
import * as pem from 'pem';
import axios from 'axios';
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

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private userRepository: Repository<InvoiceEntity>,
    private readonly empresaService: EmpresaService,
    private readonly establecimientoService: EstablecimientoService,
  ) {}

  async getExample(invoice: CreateInvoiceDto, user: QueryToken) {
    const { tokenEntityFull } = user;
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
    const existEstablecimiento = empresa.establecimientos.find(
      (est) => est.id === invoice.establecimiento,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'No puedes emitir facturas para este establecimiento',
        HttpStatus.BAD_REQUEST,
      );
    }

    const genXML = await this.generarXML(invoice, empresa, establecimiento);

    const { xml, fileName: fileNameXML } = genXML.data;

    const fileName = fileNameXML.replace('.xml', '');

    //Guardamos el XML en el directorio del cliente
    this.guardarArchivo(
      empresa.ruc,
      `/facturas/XML`,
      `${fileName}.xml`,
      xml,
      true,
    );

    //Verificamos si el cliente esta en modo beta o produccion
    const certFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/${
        empresa.modo === 0
          ? 'prueba/certificado_beta.pfx'
          : `produccion/${empresa.ruc}/${empresa.cert}`
      }`,
    );

    //Generamos el certificado.pem para firmar
    const pemFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/${
        empresa.modo === 0
          ? 'prueba/certificado_beta.pem'
          : `produccion/${empresa.ruc}/${empresa.fieldname_cert}.pem`
      }`,
    );

    const certificado = this.convertToPem(
      certFilePath,
      pemFilePath,
      empresa.cert_password,
    );

    //Firmar XML de nuestra api en PHP
    const xmlSigned: Buffer = await this.firmar(xml, certificado);

    //Guardamos el XML Firmado en el directorio del cliente
    const pathXML = this.guardarArchivo(
      empresa.ruc,
      `facturas/FIRMA`,
      `${fileName}.xml`,
      xmlSigned,
      true,
    );

    //Creamos el pdf A4
    const pathPDFA4 = this.getPdf(
      empresa.ruc,
      'facturas/PDF/A4',
      fileName,
      docDefinitionA4,
    );

    //Enviamos a Sunat
    const sunat = await this.enviarSunat(
      empresa.web_service,
      empresa.ose_enabled
        ? empresa.usu_secundario_ose_user
        : empresa.usu_secundario_user,
      empresa.ose_enabled
        ? empresa.usu_secundario_ose_password
        : empresa.usu_secundario_password,
      fileName,
      xmlSigned,
    );

    const { cdrZip, ...restoSunat } = sunat;

    //Decodificamos el CDR en base64(respuesta de sunat)
    const CdrZip = Buffer.from(cdrZip, 'base64');

    //Guardamos el CDR en el directorio del cliente
    const pathCDR = this.guardarArchivo(
      empresa.ruc,
      `facturas/RPTA`,
      `R-${fileName}.zip`,
      CdrZip,
      true,
    );

    return {
      ...restoSunat,
      ruta_xml: pathXML.replace(/\\/g, '/'),
      ruta_cdr: pathCDR.replace(/\\/g, '/'),
      ruta_a4pdf: pathPDFA4.replace(/\\/g, '/'),
      xml_hash: this.obtenerHashXMLFirmado(xmlSigned),
    };
  }

  async generarXML(
    invoice: CreateInvoiceDto,
    empresa: EmpresaEntity,
    establecimiento: EstablecimientoEntity,
  ) {
    //validamos unidad de medida

    //Si el producto tiene id validamos producto

    //Validamos si el producto pertenece a la empresa

    //Validamos si el producto pertenece al establecimiento

    //Validamos si el producto tiene stock

    const productos = invoice.productos.map((producto: any) => {
      return {
        CodProducto: producto.codigo,
        Unidad: 'NIU', // Unidad - Catalog. 03
        Cantidad: producto.cantidad,
        MtoValorUnitario: convertirDecimales(producto.precio_base, 3),
        Descripcion: producto.descripcion,
        MtoBaseIgv: convertirDecimales(producto.importe_gravada, 3),
        PorcentajeIgv: 18.0, // 18%
        Igv: convertirDecimales(producto.igv_unitario, 3) * producto.cantidad,
        TipAfeIgv: '10', // Gravado Op. Onerosa - Catalog. 07
        TotalImpuestos: convertirDecimales(producto.igv_total, 3), // Suma de impuestos en el detalle
        MtoValorVenta:
          convertirDecimales(producto.precio_base, 3) * producto.cantidad,
        MtoPrecioUnitario: convertirDecimales(producto.precio_unitario, 3),
      };
    });

    //Sumar MtoBaseIgv de los productos
    const MtoOperGravadas = productos.reduce(
      (acc, producto) => acc + producto.MtoBaseIgv,
      0,
    );

    //Calcular MtoIGV de los productos
    const MtoIGV = productos.reduce((acc, producto) => acc + producto.Igv, 0);

    //Sumar Total de impuestos de los productos
    const TotalImpuestos = productos.reduce(
      (acc, producto) => acc + producto.TotalImpuestos,
      0,
    );

    //Sumar MtoValorVenta de los productos
    const ValorVenta = productos.reduce(
      (acc, producto) => acc + producto.MtoValorVenta,
      0,
    );

    //Calcular SubTotal de los productos
    const SubTotal = ValorVenta + TotalImpuestos;

    //Calcular MtoImpVenta de los productos
    const MtoImpVenta = SubTotal;

    //Legend
    const Legend = numeroALetras(String(MtoImpVenta), 'SOLES');

    const data = {
      cliente: {
        tipo_documento: '6', //ruc es 6
        numero_documento: '20000000001', //ruc cliente
        razon_social: invoice.cliente,
        direccion: invoice.direccion,
      },
      empresa: {
        ruc: empresa.ruc,
        razon_social: empresa.razon_social,
        nombre_comercial: empresa.nombre_comercial,
      },
      establecimiento: {
        ubigeo: establecimiento.ubigeo,
        departamento: establecimiento.departamento,
        provincia: establecimiento.provincia,
        distrito: establecimiento.distrito,
        direccion: establecimiento.direccion,
        urbanizacion: '-',
        codLocal: establecimiento.codigo,
      },
      serie: invoice.serie,
      numero: completarConCeros(invoice.numero),
      tipo_operacion: invoice.tipo_operacion,
      fecha_emision: invoice.fecha_emision,
      tipo_documento: '01', //para facturas 01
      forma_pago: 1, //1 = Contado; 2 = Credito
      moneda: 'PEN',
      productos,
      MtoOperGravadas,
      MtoIGV,
      TotalImpuestos,
      ValorVenta,
      SubTotal,
      MtoImpVenta,
      LegendValue: Legend,
      LegendCode: 1000, // Monto en letras - Catalog. 52
    };

    if (invoice.fecha_vencimiento) {
      data['fecha_vencimiento'] = invoice.fecha_vencimiento;
    }

    if (invoice.observaciones.length > 0) {
      data['observaciones'] = invoice.observaciones;
      //[0].observacion
    }

    console.log(data);

    try {
      return await axios.post(`${process.env.API_SERVICE_PHP}/gen-xml`, data);
    } catch (e) {
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.generarXML ${
          e.response?.data?.message ?? 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
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

  async firmar(xml: string, certificado: string) {
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
    contentFile: Buffer,
  ) {
    try {
      const sunat = await axios.post(
        `${process.env.API_SERVICE_PHP}/sendSunat`,
        {
          urlService,
          usuario,
          contrasenia,
          fileName,
          contentFile,
        },
      );

      return {
        ...sunat.data,
        observaciones_sunat: this.quitarComillaDoble(
          sunat.data.observaciones_sunat,
        ),
      };
    } catch (e) {
      throw new HttpException(
        {
          statusCode: 502,
          message: 'Error de comunicación con el servicio: sunat.enviarSunat',
          response: e.response.data,
        },
        HttpStatus.BAD_GATEWAY,
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
}
