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
  parseFloatDecimal,
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

        const porcentajesAvailables = [18, 0];
        const gravadasGratuitas = ['11', '12', '13', '14', '15', '16', '17']; //18%
        const inafectasGratuitas = [
          '31',
          '32',
          '33',
          '34',
          '35',
          '36',
          '37',
          '21',
        ]; //0%

        //Obj para invoice details
        const productos = invoice.productos.map(async (producto) => {
          const unidad = await this.unidadService.findUnidadByCodigo(
            producto.unidad,
          );
          const tipAfeIgv = await this.tipoIgvService.findTipIgvByCodigo(
            producto.tipAfeIgv,
          );

          //Si el cliente ingresa un porcentaje invalido a sus producto alterando el igv se mostrara error
          if (!porcentajesAvailables.includes(producto.porcentajeIgv)) {
            throw new HttpException(
              'El porcentaje de IGV no es válido',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (
            producto.porcentajeIgv !== 18 &&
            (tipAfeIgv.codigo === '10' || //gravada onerosa
              gravadasGratuitas.includes(tipAfeIgv.codigo)) //gravada gratuitas
          ) {
            throw new HttpException(
              'El porcentaje de IGV no es válido para el tipo de afectación',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (
            producto.porcentajeIgv !== 0 &&
            (tipAfeIgv.codigo === '20' || //exonerada onerosa
              tipAfeIgv.codigo === '30' || //inafecta onerosa
              tipAfeIgv.codigo === '40' || //exportacion
              inafectasGratuitas.includes(tipAfeIgv.codigo)) //inafecta gratuitas
          ) {
            throw new HttpException(
              'El porcentaje de IGV no es válido para el tipo de afectación',
              HttpStatus.BAD_REQUEST,
            );
          }

          const item: InvoiceDetailsEntity = {
            unidad, // Unidad - Catalog. 03
            tipAfeIgv, // Gravado Op. Onerosa - Catalog. 07
            codigo: producto.codigo,
            cantidad: producto.cantidad,
            producto: producto.descripcion,
            mtoValorUnitario: convertirDecimales(producto.mtoValorUnitario, 3),
            porcentajeIgv: producto.porcentajeIgv,
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

        const calcOperaciones = this.obtenerOperacionesInvoice(todosProductos);

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
          mto_operaciones_gravadas: calcOperaciones.mtoOperGravadas,
          mto_operaciones_exoneradas: calcOperaciones.mtoOperExoneradas,
          mto_operaciones_inafectas: calcOperaciones.mtoOperInafectas,
          mto_operaciones_exportacion: calcOperaciones.mtoOperExportacion,
          mto_operaciones_gratuitas: calcOperaciones.mtoOperGratuitas,
          mto_igv: calcOperaciones.mtoIGV,
          mto_igv_gratuitas: calcOperaciones.mtoIGVGratuitas,
          //porcentaje_igv: 0.18,
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

        // console.log(await this.findOneInvoice('F003', '00000001', 1, 4));

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
          invoiceObj,
          invoiceResult.empresa,
          invoiceResult.establecimiento,
          calcOperaciones,
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
        this.guardarArchivo(
          invoiceResult.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/FIRMA`,
          `${fileName}.xml`,
          xmlSigned,
          true,
        );

        //Creamos el pdf A4
        this.getPdf(
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
        `Error al intentar crear CPE InvoiceService.create. ${
          e.response ?? e.message
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;

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
        observaciones_sunat: rptaObs,
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
        observaciones_sunat: rptaObs,
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
    calcOperaciones: any,
    todosProductos: InvoiceDetailsEntity[],
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
      productos: todosProductos.reduce((acc, producto) => {
        //gravada onerosa
        if (producto.tipAfeIgv.codigo === '10') {
          const mtoValorUnitario = parseFloatDecimal(
            producto.mtoValorUnitario,
            1000,
          );
          const mtoValorVenta = mtoValorUnitario * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 18
          const igvUnitario = (mtoValorUnitario * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;
          const mtoPrecioUnitario = mtoValorUnitario + igvUnitario;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: mtoValorUnitario, //3decimales
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: parseFloatDecimal(mtoPrecioUnitario, 100),
          };

          acc.push(objProduct);
        }

        //exonerada onerosa
        if (producto.tipAfeIgv.codigo === '20') {
          const mtoValorUnitario = parseFloatDecimal(
            producto.mtoValorUnitario,
            1000,
          );
          const mtoValorVenta = mtoValorUnitario * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 0
          const igvUnitario = (mtoValorUnitario * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;
          const mtoPrecioUnitario = mtoValorUnitario + igvUnitario;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: mtoValorUnitario,
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: parseFloatDecimal(mtoPrecioUnitario, 100),
          };

          acc.push(objProduct);
        }

        //inafecto onerosa
        if (producto.tipAfeIgv.codigo === '30') {
          const mtoValorUnitario = parseFloatDecimal(
            producto.mtoValorUnitario,
            1000,
          );
          const mtoValorVenta = mtoValorUnitario * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 0
          const igvUnitario = (mtoValorUnitario * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;
          const mtoPrecioUnitario = mtoValorUnitario + igvUnitario;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: mtoValorUnitario,
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: parseFloatDecimal(mtoPrecioUnitario, 100),
          };

          acc.push(objProduct);
        }

        //exportacion
        if (producto.tipAfeIgv.codigo === '40') {
          const mtoValorUnitario = parseFloatDecimal(
            producto.mtoValorUnitario,
            1000,
          );
          const mtoValorVenta = mtoValorUnitario * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 0
          const igvUnitario = (mtoValorUnitario * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;
          const mtoPrecioUnitario = mtoValorUnitario + igvUnitario;

          const objProduct = {
            codigo: producto.codigo,
            //setCodProdSunat('44121618') // Codigo Producto Sunat, requerido.
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: mtoValorUnitario,
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: parseFloatDecimal(mtoPrecioUnitario, 100),
          };

          acc.push(objProduct);
        }

        //gravadas gratuitas
        if (
          ['11', '12', '13', '14', '15', '16', '17'].includes(
            producto.tipAfeIgv.codigo,
          )
        ) {
          const mtoValorGratuito = parseFloatDecimal(
            producto.mtoValorGratuito,
            1000,
          );
          const mtoValorVenta = mtoValorGratuito * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 18
          const igvUnitario = (mtoValorGratuito * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: 0,
            mtoValorGratuito: mtoValorGratuito,
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: 0,
          };

          acc.push(objProduct);
        }

        //inafectas gratuitas
        if (
          ['31', '32', '33', '34', '35', '36', '37', '21'].includes(
            producto.tipAfeIgv.codigo,
          )
        ) {
          const mtoValorGratuito = parseFloatDecimal(
            producto.mtoValorGratuito,
            1000,
          );
          const mtoValorVenta = mtoValorGratuito * producto.cantidad;
          const mtoBaseIgv = mtoValorVenta;
          const porcentajeIgv = producto.porcentajeIgv;

          //producto.porcentajeIgv = 0
          const igvUnitario = (mtoValorGratuito * porcentajeIgv) / 100;
          const igv = igvUnitario * producto.cantidad;
          const totalImpuestos = igv + 0;

          const objProduct = {
            codigo: producto.codigo,
            unidad: producto.unidad.codigo,
            producto: producto.producto,
            cantidad: producto.cantidad,
            mtoValorUnitario: 0,
            mtoValorGratuito: mtoValorGratuito,
            mtoValorVenta: parseFloatDecimal(mtoValorVenta, 100),
            mtoBaseIgv: parseFloatDecimal(mtoBaseIgv, 100),
            porcentajeIgv: porcentajeIgv,
            igv: parseFloatDecimal(igv, 100),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: parseFloatDecimal(totalImpuestos, 100),
            mtoPrecioUnitario: 0,
          };

          acc.push(objProduct);
        }

        return acc;
      }, []),
      MtoOperGravadas: invoice.mto_operaciones_gravadas,
      MtoIGV: invoice.mto_igv,
      TotalImpuestos: calcOperaciones.totalImpuestos,
      ValorVenta: calcOperaciones.valorVenta,
      SubTotal: calcOperaciones.subTotal,
      MtoImpVenta: calcOperaciones.mtoImpVenta,
      LegendValue: numeroALetras(String(calcOperaciones.mtoImpVenta), 'SOLES'),
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

    //Solo enviaremos los datos necesarios a la api generar xml
    if (
      invoice.mto_operaciones_gravadas === null ||
      invoice.mto_operaciones_gravadas === 0
    ) {
      delete dataApi.MtoOperGravadas;
    }

    if (
      invoice.mto_operaciones_exoneradas === null ||
      invoice.mto_operaciones_exoneradas === 0
    ) {
      delete dataApi.MtoOperExoneradas;
    }

    if (
      invoice.mto_operaciones_inafectas === null ||
      invoice.mto_operaciones_inafectas === 0
    ) {
      delete dataApi.MtoOperInafectas;
    }

    if (
      invoice.mto_operaciones_exportacion === null ||
      invoice.mto_operaciones_exportacion === 0
    ) {
      delete dataApi.MtoOperExportacion;
    }

    if (
      invoice.mto_operaciones_gratuitas === null ||
      invoice.mto_operaciones_gratuitas === 0
    ) {
      delete dataApi.MtoOperGratuitas;
    }

    if (invoice.mto_igv_gratuitas === null || invoice.mto_igv_gratuitas === 0) {
      delete dataApi.MtoIGVGratuitas;
    }

    if (invoice.mto_igv === null || invoice.mto_igv === 0) {
      delete dataApi.MtoIGV;
    }

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

  async consultarCDR(
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
      const message = `[${e.response.data.error?.code}]:${e.response.data.error?.message}`;
      throw new HttpException(
        `Error de comunicación con el servicio: sunat.consultarCDR - ${
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

  //CRON SERVER
  async findAllInvoicesCron(idEmpresa: number, idEstablecimiento: number) {
    try {
      return await this.invoiceRepository.find({
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
    } catch (e) {
      throw new HttpException(
        `Error al buscar comprobantes InvoiceService.findAllInvoicesCron`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //API
  async listInvoices(
    user: QueryToken,
    idEmpresa: number,
    idEstablecimiento: number,
    page: number,
    pageSize: number,
  ) {
    const _take = Number(pageSize);
    const _skip = (Number(page) - 1) * _take;

    const empresasAsignadas = user.tokenEntityFull.empresas;

    //validamos la existencia de la empresa
    const empresa = (await this.empresaService.findOneEmpresaById(
      idEmpresa,
      true,
    )) as EmpresaEntity;

    //Validamos si la empresa emisora pertenece a las empresas asignadas al usuario
    const existEmpresa = empresasAsignadas.find((emp) => emp.id === empresa.id);

    if (!existEmpresa) {
      throw new HttpException(
        'La empresa en consulta no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validamos la existencia del establecimiento
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        idEstablecimiento,
      );

    //Validamos si el establecimiento emisor pertenece a las empresas asignadas al usuario
    const existEstablecimiento = existEmpresa.establecimientos.find(
      (est) => est.id === establecimiento.id,
    );

    if (!existEstablecimiento) {
      throw new HttpException(
        'El establecimiento en consulta no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const invoices = await this.invoiceRepository.find({
        take: _take,
        skip: _skip,
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
        order: {
          createdAt: 'DESC',
        },
      });

      const countInvoices = await this.invoiceRepository.count({
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
      const nextPage = countInvoices > _take * page;
      const prevPage = page > 1;
      const totalPage = Math.ceil(countInvoices / _take);

      return {
        statusCode: 'success',
        total: countInvoices,
        currentPage: Number(page),
        nextPage: nextPage,
        prevPage: prevPage,
        totalPage: totalPage,
        items: invoices.map((invoice) => {
          const ruc = invoice.empresa.ruc;
          const tipoDoc = invoice.tipo_doc.codigo;
          const nomDoc = invoice.tipo_doc.tipo_documento;
          const serie = invoice.serie;
          const correlativo = invoice.correlativo;
          const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
          const establecimiento = `${invoice.establecimiento.codigo}`;

          const pathDirFirma = path.join(
            process.cwd(),
            `uploads/files/${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`,
          );

          const pathDirCDR = path.join(
            process.cwd(),
            `uploads/files/${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`,
          );

          const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            UBLVersionID,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            CustomizationID,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            createdAt,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            fecha_emision,
            ...rest
          } = invoice;

          return {
            ...rest,
            cliente: invoice.cliente
              ? {
                  id: invoice.cliente.id,
                  entidad: rest.cliente.entidad,
                  nombre_comercial: invoice.cliente.nombre_comercial,
                  numero_documento: invoice.cliente.numero_documento,
                  estado: invoice.cliente.estado,
                }
              : null,
            empresa: {
              id: invoice.empresa.id,
              ruc: invoice.empresa.ruc,
              razon_social: invoice.empresa.razon_social,
              nombre_comercial: invoice.empresa.nombre_comercial,
              estado: invoice.empresa.estado,
              modo: invoice.empresa.modo === 0 ? 'BETA' : 'PRODUCCION',
            },
            establecimiento: {
              id: invoice.establecimiento.id,
              codigo: invoice.establecimiento.codigo,
              denominacion: invoice.establecimiento.denominacion,
              estado: invoice.establecimiento.estado,
            },
            status: [0, 2, 3].includes(invoice.estado_operacion),
            xml: !fs.existsSync(pathDirFirma)
              ? '#'
              : `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`,
            cdr: !fs.existsSync(pathDirCDR)
              ? '#'
              : `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`,
            pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/${fileName}.pdf`,
            usuario: invoice.usuario.nombres + ' ' + invoice.usuario.apellidos,
            moneda: invoice.tipo_moneda,
            fecha_registro: dayjs(invoice.createdAt).format(
              'DD-MM-YYYY·HH:mm:ss',
            ),
            fecha_emision: dayjs(invoice.fecha_emision).format(
              'DD-MM-YYYY·HH:mm:ss',
            ),
          };
        }),
      };
    } catch (e) {
      throw new HttpException(
        'Error al buscar los cpes listado',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //SOCKET
  async getInvoicesToNotify(idEmpresa: number, idEstablecimiento: number) {
    try {
      return await this.invoiceRepository.find({
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
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar los cpes listado InvoiceService.getInvoicesToNotify',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //SOCKET
  async finAllInvoices(
    idEmpresa: number,
    idEstablecimiento: number,
    page: number,
    pageSize: number,
  ) {
    const _take = pageSize || 10;
    const _skip = (page - 1) * _take;

    try {
      const invoices = await this.invoiceRepository.find({
        take: _take,
        skip: _skip,
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
        order: {
          createdAt: 'DESC',
        },
      });

      const countInvoices = await this.invoiceRepository.count({
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
      const nextPage = countInvoices > _take * page;
      const prevPage = page > 1;
      const totalPage = Math.ceil(countInvoices / _take);

      return {
        statusCode: 'success',
        data: invoices.map((invoice) => {
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
            status: [0, 2, 3].includes(invoice.estado_operacion),
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
        }),
        total: countInvoices,
        currentPage: page,
        nextPage: nextPage,
        prevPage: prevPage,
        totalPage: totalPage,
      };
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
    const operaciones = productos.reduce(
      (acc, producto) => {
        //gravadas
        if (producto.tipAfeIgv.codigo === '10') {
          const igv = parseFloatDecimal(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
            100,
          );

          const opeGravadas = parseFloatDecimal(
            producto.mtoValorUnitario * producto.cantidad,
            100,
          );

          acc.mtoIGVGravadas += igv;
          acc.mtoOperGravadas += opeGravadas;
        }

        //exonegaradas
        if (producto.tipAfeIgv.codigo === '20') {
          const igv = parseFloatDecimal(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
            100,
          );

          const opeExoneradas = parseFloatDecimal(
            producto.mtoValorUnitario * producto.cantidad,
            100,
          );

          acc.mtoOperExoneradas += opeExoneradas;
          acc.mtoIGVExoneradas += igv;
        }

        //inafectas
        if (producto.tipAfeIgv.codigo === '30') {
          const igv = parseFloatDecimal(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
            100,
          );

          const opeInafectas = parseFloatDecimal(
            producto.mtoValorUnitario * producto.cantidad,
            100,
          );

          acc.mtoOperInafectas += opeInafectas;
          acc.mtoIGVInafectas += igv;
        }

        //exportacion
        if (producto.tipAfeIgv.codigo === '40') {
          const igv = parseFloatDecimal(
            ((producto.mtoValorUnitario * producto.porcentajeIgv) / 100) *
              producto.cantidad,
            100,
          );

          const opeExportacion = parseFloatDecimal(
            producto.mtoValorUnitario * producto.cantidad,
            100,
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
          const igv = parseFloatDecimal(
            ((producto.mtoValorGratuito * producto.porcentajeIgv) / 100) *
              producto.cantidad,
            100,
          );

          const opeGratuitas = parseFloatDecimal(
            producto.mtoValorGratuito * producto.cantidad,
            100,
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

        acc.subTotal = parseFloatDecimal(
          acc.valorVenta + acc.totalImpuestos,
          100,
        );

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

  formatListInvoices(invoice: InvoiceEntity) {
    //formateamos result
    const urlStatic = this.configService.get<string>('URL_FILES_STATIC');
    const rucAux = invoice.empresa.ruc;
    const tipoDocAux = invoice.tipo_doc.codigo;
    const nomDocAux = invoice.tipo_doc.tipo_documento;
    const serieAux = invoice.serie;
    const correlativoAux = invoice.correlativo;
    const fileNameAux = `${rucAux}-${tipoDocAux}-${serieAux}-${correlativoAux}`;
    const establecimientoAux = `${invoice.establecimiento.codigo}`;

    const pathDirFirma = path.join(
      process.cwd(),
      `uploads/files/${rucAux}/${establecimientoAux}/${nomDocAux}/FIRMA/${fileNameAux}.xml`,
    );

    const pathDirCDR = path.join(
      process.cwd(),
      `uploads/files/${rucAux}/${establecimientoAux}/${nomDocAux}/RPTA/R-${fileNameAux}.zip`,
    );

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      UBLVersionID,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      CustomizationID,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fecha_emision,
      ...rest
    } = invoice;

    return {
      ...rest,
      cliente: invoice.cliente
        ? {
            id: invoice.cliente.id,
            entidad: rest.cliente.entidad,
            nombre_comercial: invoice.cliente.nombre_comercial,
            numero_documento: invoice.cliente.numero_documento,
            estado: invoice.cliente.estado,
          }
        : null,
      empresa: {
        id: invoice.empresa.id,
        ruc: invoice.empresa.ruc,
        razon_social: invoice.empresa.razon_social,
        nombre_comercial: invoice.empresa.nombre_comercial,
        estado: invoice.empresa.estado,
        modo: invoice.empresa.modo === 0 ? 'BETA' : 'PRODUCCION',
      },
      establecimiento: {
        id: invoice.establecimiento.id,
        codigo: invoice.establecimiento.codigo,
        denominacion: invoice.establecimiento.denominacion,
        estado: invoice.establecimiento.estado,
      },
      status: [0, 2, 3].includes(invoice.estado_operacion),
      xml: !fs.existsSync(pathDirFirma)
        ? '#'
        : `${urlStatic}/${rucAux}/${establecimientoAux}/${nomDocAux}/FIRMA/${fileNameAux}.xml`,
      cdr: !fs.existsSync(pathDirCDR)
        ? '#'
        : `${urlStatic}/${rucAux}/${establecimientoAux}/${nomDocAux}/RPTA/R-${fileNameAux}.zip`,
      pdfA4: `${urlStatic}/${rucAux}/${establecimientoAux}/${nomDocAux}/PDF/A4/${fileNameAux}.pdf`,
      usuario: invoice.usuario.nombres + ' ' + invoice.usuario.apellidos,
      moneda: invoice.tipo_moneda,
      fecha_registro: dayjs(invoice.createdAt).format('DD-MM-YYYY·HH:mm:ss'),
      fecha_emision: dayjs(invoice.fecha_emision).format('DD-MM-YYYY·HH:mm:ss'),
    };
  }
}
