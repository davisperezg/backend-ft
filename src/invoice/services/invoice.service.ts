import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from '../entities/invoice.entity';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { SignedXml, FileKeyInfo } from 'xml-crypto';
//const pem = require('pem').DER2PEM();
import * as AdmZip from 'adm-zip';
import * as base64 from 'base-64';
import { createClientAsync, Client, WSSecurity, createClient } from 'soap';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private userRepository: Repository<InvoiceEntity>,
  ) {}

  //multipart/form-data
  //C:/Users/keiner/Proyectos/php/api/utils/xml/10481211641-03-B001-8.xml
  //C:/Users/keiner/Proyectos/php/api/utils/certificado_digital/server_key.pem
  async getExample() {
    //Obtener xml firmado de nuestra api en PHP
    const xmlSigned = await axios.post(
      'http://localhost:8000/api/sign',
      {
        xml: 'C:/Users/keiner/Proyectos/factv2/backend-adm-rpum/xml/20123456789-01-F001-1.xml',
        certificado:
          'C:/Users/keiner/Proyectos/factv2/backend-adm-rpum/src/utils/certificado_digital/prueba/server_key.pem',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    //Guardamos el xml firmado
    await this.writeFile('20123456789-01-F001-1.xml', xmlSigned.data);

    //Preparamos xml firmado para enviar a sunat
    const resSunat = await axios.post(
      'http://localhost:8000/api/sign/sendSunat',
      {
        urlService:
          'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
        usuario: '20000000001MODDATOS',
        contrasenia: 'moddatos',
        fileName: '20123456789-01-F001-1',
        contentFile: xmlSigned.data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const respuesta = resSunat.data;
    console.log(respuesta);
    //Decodificamos en base64 al archivo CDR Zipeado
    const CdrZip = Buffer.from(respuesta.cdrZip, 'base64');

    //Guardamos el CDR
    fs.writeFileSync(`R-${'20123456789-01-F001-1'}.zip`, CdrZip);

    return resSunat.data;
  }

  readFile(srcPath: string): Promise<any> {
    return new Promise(function (resolve, reject) {
      fs.readFile(srcPath, 'utf8', function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  writeFile(savPath: string, data: string): Promise<any> {
    return new Promise(function (resolve, reject) {
      fs.writeFile(savPath, data, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  createZip(xmlSigned: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const zip = new AdmZip();
      zip.addFile('10481211641-03-B001-8.xml', Buffer.from(xmlSigned));
      const zipFileName = '10481211641-03-B001-8.zip';
      zip.writeZip(zipFileName, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(zipFileName);
        }
      });
    });
  }

  obtenerClavePublica(certificate: string) {
    const regex = /-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s;
    const match = certificate.match(regex);

    if (match && match.length > 1) {
      return match[1].replace(/\s/g, '');
    } else {
      return null;
    }
  }

  signXml(xml: string, xpath, key, dest) {
    const sig = new SignedXml();
    sig.signingKey = key;
    sig.canonicalizationAlgorithm =
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
    //sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#sha1';

    sig.addReference(
      xpath,
      ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
      'http://www.w3.org/2000/09/xmldsig#X509Data',
    );

    sig.computeSignature(xml);
    console.log('La firma es:', sig.getSignatureXml());
    const signedXml = xml.replace(
      '<ext:ExtensionContent>',
      `<ext:ExtensionContent>${sig.getSignatureXml()}</ext:ExtensionContent>`,
    );

    //sig.getSignedXml()
    fs.writeFileSync(dest, signedXml);
  }

  /**
   *  //Creamos el zip con el xml firmado
    const zipFile = await this.createZip(xmlSigned.data);
    console.log('Archivo ZIP creado:', zipFile);

    //Leemos el zip creado
    const readZip = await this.readFile('10481211641-03-B001-8.zip');
    console.log(readZip);
    //Convertimos el zip en base64
    //const base64Data = zipBuffer.toString('base64');

    //Envie la base64directamente pero no funciono
    //console.log(base64Data);

    //Leemos el zip y decodificamos en base64
    const zipBuffer = Buffer.from(resSunat.data, 'base64');

    //Guardamos el archivo ZIP
    fs.writeFileSync('result.zip', zipBuffer);
    //console.log(resSunat.data);
   */
}
