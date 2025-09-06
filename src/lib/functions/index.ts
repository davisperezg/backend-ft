import path from 'path';
import { promises as fsPromises } from 'fs';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import PdfPrinter from 'pdfmake';
import { PassThrough } from 'stream';
import * as fs from 'fs';
import { QueryInvoiceList } from 'src/invoice/dto/query-invoice-list';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { v4 as uuidv4 } from 'uuid';

// Add this function near the top of your file or in a utility module
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 5000,
  shouldRetry = (err: any) => true,
): Promise<T> {
  let lastError: any;
  const logger = new Logger('withRetry');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export async function getPdf(
  docDefinition: TDocumentDefinitions,
): Promise<Buffer> {
  // Configuración de fuentes
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
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.pipe(stream);
    pdfDoc.end();

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) =>
      reject(new Error(`Error al generar el PDF: ${err}`)),
    );
  });
}

export const guardarArchivo = async (
  ruta: string,
  archivo: string,
  dataArchivoOrPath: string | Buffer,
  buffer?: boolean,
) => {
  const pathDir = path.join(process.cwd(), ruta);

  try {
    // Creamos el directorio si no existe
    await fsPromises.mkdir(pathDir, { recursive: true });

    const archivoPath = path.join(pathDir, archivo);

    // Escribimos el archivo
    const contenido = buffer
      ? dataArchivoOrPath
      : await fsPromises.readFile(dataArchivoOrPath as string);

    await fsPromises.writeFile(archivoPath, contenido);

    return archivoPath;
  } catch (error) {
    const mensaje =
      error.code === 'ENOENT'
        ? `Error al leer el archivo path_${archivo} o no existe`
        : 'Error al crear directorio o guardar archivo';

    throw new HttpException(mensaje, HttpStatus.BAD_REQUEST);
  }
};

export const validarFormatoUUID = (uuid: string) => {
  const regex =
    /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regex.test(uuid);
};

export const completarConCeros = (valor: string, longitud = 8) => {
  // Asegurarse de que el valor sea una cadena
  let valorCadena = String(valor);

  // Completar con ceros a la izquierda hasta alcanzar la longitud deseada (8)
  while (valorCadena.length < longitud) {
    valorCadena = '0' + valorCadena;
  }

  // Limitar la longitud a 8 caracteres
  if (valorCadena.length > longitud) {
    valorCadena = valorCadena.slice(0, longitud);
  }

  return valorCadena;
};

export const quitarCerosIzquierda = (valor: string) => {
  return valor.replace(/^0+/, '');
};

export const round = (num: number, decimales = 2) => {
  const signo = num >= 0 ? 1 : -1;
  num = num * signo;
  if (decimales === 0) return signo * Math.round(num);
  const numAux = num.toString().split('e');
  num = Math.round(
    +(numAux[0] + 'e' + (numAux[1] ? +numAux[1] + decimales : decimales)),
  );
  const num2Aux = num.toString().split('e');
  return (
    signo *
    Number(
      num2Aux[0] + 'e' + (num2Aux[1] ? +num2Aux[1] - decimales : -decimales),
    )
  );
};

export const fixed = (num: number, decimales = 2) => {
  return num.toFixed(decimales);
};

export const parseFloatDecimal = (valor: number, decimales: number) => {
  return Math.round(valor * decimales) / decimales;
};

export const convertirDecimales = (valor: string, decimales: number) => {
  const valorNumber = parseFloat(valor.replace(/,/g, ''));
  return parseFloat(valorNumber.toFixed(decimales));
};

export const numeroALetras = (num: number) => {
  const Unidades = (num: number) => {
    const aLetras: { [key: number]: string } = {
      1: 'UNO',
      2: 'DOS',
      3: 'TRES',
      4: 'CUATRO',
      5: 'CINCO',
      6: 'SEIS',
      7: 'SIETE',
      8: 'OCHO',
      9: 'NUEVE',
    };

    return aLetras[num] || '';
  }; // Unidades()

  const Decenas = (num: number) => {
    const decena = Math.floor(num / 10);
    const unidad = num - decena * 10;

    const aLetras: { [key: number]: string } = {
      1: (() => {
        const aLetra: { [key: number]: string } = {
          0: 'DIEZ',
          1: 'ONCE',
          2: 'DOCE',
          3: 'TRECE',
          4: 'CATORCE',
          5: 'QUINCE',
        };
        return aLetra[unidad] || 'DIECI' + Unidades(unidad);
      })(),
      2: unidad == 0 ? '' : 'VEINTI' + Unidades(unidad),
      3: DecenasY('TREINTA', unidad),
      4: DecenasY('CUARENTA', unidad),
      5: DecenasY('CINCUENTA', unidad),
      6: DecenasY('SESENTA', unidad),
      7: DecenasY('SETENTA', unidad),
      8: DecenasY('OCHENTA', unidad),
      9: DecenasY('NOVENTA', unidad),
      0: Unidades(unidad),
    };

    return aLetras[decena] || '';
  }; //Decenas()

  const DecenasY = (strSin: string, numUnidades: number) => {
    if (numUnidades > 0) return strSin + ' Y ' + Unidades(numUnidades);
    return strSin;
  }; //DecenasY()

  const Centenas = (num: number) => {
    const centenas = Math.floor(num / 100);
    const decenas = num - centenas * 100;

    const aLetras: { [key: number]: string } = {
      1: decenas > 0 ? 'CIENTO ' + Decenas(decenas) : 'CIEN',
      2: 'DOSCIENTOS ' + Decenas(decenas),
      3: 'TRESCIENTOS ' + Decenas(decenas),
      4: 'CUATROCIENTOS ' + Decenas(decenas),
      5: 'QUINIENTOS ' + Decenas(decenas),
      6: 'SEISCIENTOS ' + Decenas(decenas),
      7: 'SETECIENTOS ' + Decenas(decenas),
      8: 'OCHOCIENTOS ' + Decenas(decenas),
      9: 'NOVECIENTOS ' + Decenas(decenas),
    };

    return aLetras[centenas] || Decenas(decenas);
  }; //Centenas()

  const Seccion = (
    num: number,
    divisor: number,
    strSingular: string,
    strPlural: string,
  ) => {
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    let letras = '';

    if (cientos > 0)
      if (cientos > 1) letras = Centenas(cientos) + ' ' + strPlural;
      else letras = strSingular;

    if (resto > 0) letras += '';

    return letras;
  }; //Seccion()

  const Miles = (num: number) => {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    const strMiles = Seccion(num, divisor, 'UN MIL', 'MIL');
    const strCentenas = Centenas(resto);

    if (strMiles == '') return strCentenas;
    return strMiles + ' ' + strCentenas;
  }; //Miles()

  const Millones = (num: number) => {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;

    const strMillones = Seccion(num, divisor, 'UN MILLON DE', 'MILLONES DE');
    const strMiles = Miles(resto);

    if (strMillones == '') return strMiles;
    return strMillones + ' ' + strMiles;
  }; //Millones()

  const data = {
    numero: num,
    enteros: Math.floor(num),
    decimales: Math.round(num * 100) - Math.floor(num) * 100,
    letrasDecimales: '',
  };

  const deciamles =
    data.decimales < 10 ? `0${data.decimales}` : `${data.decimales}`;
  //if (data.decimales > 0) data.letrasDecimales = Millones(data.decimales);
  if (data.decimales > 0) data.letrasDecimales = deciamles;

  if (data.enteros == 0) return 'CERO CON ' + `${deciamles}/100 SOLES`;
  if (data.enteros == 1)
    return Millones(data.enteros) + ' CON ' + `${deciamles}/100 SOLES`;
  else
    return (
      Millones(data.enteros) + ' CON ' + `${data.letrasDecimales}/100 SOLES`
    );
};

export const formatListInvoices = async (
  invoice: InvoiceEntity,
  fileName: string,
): Promise<QueryInvoiceList> => {
  try {
    const urlStatic =
      process.env.URL_FILES_STATIC || 'http://localhost:3000/files';

    const { ruc } = invoice.empresa;
    const { codigo: tipoDoc, tipo_documento: nomDoc } = invoice.tipo_doc;
    const establecimiento = `${invoice.establecimiento.codigo}`;

    let rutaFirma = '';
    let rutaCDR = '';

    //null(no enviado), 1(enviado con ticket), 2(anulacion aceptado), 3(anulacion rechazada)
    if (invoice.estado_anulacion === 2) {
      rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/BAJA/FIRMA/${fileName}.xml`;
      rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/BAJA/RPTA/R-${fileName}.zip`;
    }
    //0(creado), 1(enviando), 2(aceptado), 3(rechazado)
    else if ([0, 2, 3].includes(invoice.estado_operacion)) {
      rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`;
      rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`;
    }

    const pathDirFirma = path.join(process.cwd(), `uploads/files/${rutaFirma}`);
    const pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

    const pathStaticFirma = `${urlStatic}/${rutaFirma}`;
    const pathStaticCDR = `${urlStatic}/${rutaCDR}`;

    const [firmaExists, cdrExists] = await Promise.all([
      fileExists(pathDirFirma),
      fileExists(pathDirCDR),
    ]);

    const result: QueryInvoiceList = {
      id: invoice.id,
      tipo_operacion: invoice.tipo_operacion,
      serie: invoice.serie,
      correlativo: invoice.correlativo,
      fecha_vencimiento: invoice.fecha_vencimiento,
      mto_operaciones_gravadas: invoice.mto_operaciones_gravadas,
      mto_operaciones_exoneradas: invoice.mto_operaciones_exoneradas,
      mto_operaciones_inafectas: invoice.mto_operaciones_inafectas,
      mto_operaciones_exportacion: invoice.mto_operaciones_exportacion,
      mto_operaciones_gratuitas: invoice.mto_operaciones_gratuitas,
      mto_igv: invoice.mto_igv,
      mto_igv_gratuitas: invoice.mto_igv_gratuitas,
      porcentaje_igv: invoice.porcentaje_igv,
      estado_operacion: invoice.estado_operacion,
      estado_anulacion: invoice.estado_anulacion,
      respuesta_sunat_codigo: invoice.respuesta_sunat_codigo,
      respuesta_sunat_descripcion: invoice.respuesta_sunat_descripcion,
      respuesta_anulacion_codigo: invoice.respuesta_anulacion_codigo,
      respuesta_anulacion_descripcion: invoice.respuesta_anulacion_descripcion,
      observaciones_sunat: invoice.observaciones_sunat,
      observaciones: invoice.observaciones_invoice
        ? invoice.observaciones_invoice.split('|').map((item) => ({
            observacion: item,
            uuid: uuidv4(),
          }))
        : [],
      borrador: invoice.borrador,
      documento: nomDoc,
      tipo_documento: tipoDoc,
      cliente: invoice.cliente ? invoice.cliente.entidad : invoice.entidad,
      cliente_direccion: invoice.cliente
        ? invoice.cliente.direccion
        : invoice.entidad_direccion,
      cliente_cod_doc: invoice.cliente
        ? invoice.cliente.tipo_entidad.codigo
        : invoice.entidad_tipo,
      cliente_num_doc: invoice.cliente
        ? invoice.cliente.numero_documento
        : invoice.entidad_documento,
      empresa: invoice.empresa.id,
      establecimiento: invoice.establecimiento.id,
      pos: invoice.pos.id,
      envio_sunat_modo: invoice.envio_sunat_modo,
      usuario: `${invoice.usuario.nombres} ${invoice.usuario.apellidos}`,
      moneda_abrstandar: invoice.tipo_moneda.abrstandar,
      moneda_simbolo: invoice.tipo_moneda.simbolo,
      fecha_registro: invoice.createdAt,
      fecha_emision: invoice.fecha_emision,
      forma_pago: invoice.forma_pago.forma_pago,
      cdr: cdrExists ? pathStaticCDR : '#',
      xml: firmaExists ? pathStaticFirma : '#',
      pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/test.pdf`,
      status: [0, 2, 3].includes(invoice.estado_operacion),
      details: invoice.invoices_details.map((item, i) => ({
        id: item.id,
        posicionTabla: i,
        uuid: uuidv4(),
        cantidad: item.cantidad,
        codigo: item.codigo,
        descripcion: item.descripcion,
        mtoValorUnitario: item.mtoValorUnitario,
        porcentajeIgv: item.porcentajeIgv,
        tipAfeIgv: item.tipAfeIgv.codigo,
        unidad: item.unidad.codigo,
      })),
    };

    return result;
  } catch (error) {
    throw new HttpException(
      'Error al formatear comprobante',
      HttpStatus.BAD_REQUEST,
    );
  }
};
