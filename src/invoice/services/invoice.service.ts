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

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private userRepository: Repository<InvoiceEntity>,
  ) {}

  async getExample(invoice: CreateInvoiceDto, user: QueryToken) {
    const { tokenEntityFull } = user;
    const { empresas } = tokenEntityFull;
    //console.log(tokenEntityFull);
    const { xml, fileName } = invoice;

    //Guardamos el XML en el directorio del cliente
    // this.guardarArchivo(
    //   empresa.ruc,
    //   `/facturas/XML`,
    //   `${fileName}.xml`,
    //   xml,
    //   false,
    // );

    //Verificamos si el cliente esta en modo beta o produccion
    // const certFilePath = path.join(
    //   process.cwd(),
    //   `uploads/certificado_digital/${
    //     empresa.modo === 0
    //       ? 'prueba/certificado_beta.pfx'
    //       : `produccion/${empresa.ruc}/${empresa.cert}`
    //   }`,
    // );

    //Generamos el certificado.pem para firmar
    // const pemFilePath = path.join(
    //   process.cwd(),
    //   `uploads/certificado_digital/${
    //     empresa.modo === 0
    //       ? 'prueba/certificado_beta.pem'
    //       : `produccion/${empresa.ruc}/${empresa.fieldname_cert}.pem`
    //   }`,
    // );

    // const certificado = this.convertToPem(
    //   certFilePath,
    //   pemFilePath,
    //   empresa.cert_password,
    // );

    //Firmar XML de nuestra api en PHP
    //const xmlSigned: Buffer = await this.firmar(xml, certificado);

    //Guardamos el XML Firmado en el directorio del cliente
    // const pathXML = this.guardarArchivo(
    //   empresa.ruc,
    //   `facturas/FIRMA`,
    //   `${fileName}.xml`,
    //   xmlSigned,
    //   true,
    // );

    //Creamos el pdf A4
    // const pathPDFA4 = this.getPdf(
    //   empresa.ruc,
    //   'facturas/PDF/A4',
    //   fileName,
    //   docDefinitionA4,
    // );

    //Enviamos a Sunat
    const sunat = await this.enviarSunat(
      'empresa.web_service',
      'empresa.ose_enabled'
        ? 'empresa.usu_secundario_ose_user'
        : 'empresa.usu_secundario_user',
      'empresa.ose_enabled'
        ? 'empresa.usu_secundario_ose_password'
        : 'empresa.usu_secundario_password',
      fileName,
      'xmlSigned' as any,
    );
    const { cdrZip, ...restoSunat } = sunat;

    //Decodificamos el CDR en base64(respuesta de sunat)
    const CdrZip = Buffer.from(cdrZip, 'base64');

    //Guardamos el CDR en el directorio del cliente
    const pathCDR = this.guardarArchivo(
      'empresa.ruc',
      `facturas/RPTA`,
      `${`R-${fileName}.zip`}`,
      CdrZip,
      true,
    );

    return {
      ...restoSunat,
      //ruta_xml: pathXML.replace(/\\/g, '/'),
      ruta_cdr: pathCDR.replace(/\\/g, '/'),
      //ruta_a4pdf: pathPDFA4.replace(/\\/g, '/'),
      //xml_hash: this.obtenerHashXMLFirmado(xmlSigned),
    };
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
        `${process.env.API_SERVICE_PHP}/sign/sendSunat`,
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
