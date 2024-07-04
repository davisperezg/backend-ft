import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, Repository } from 'typeorm';
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
import { numeroALetras, round } from 'src/lib/functions';
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
import { CreateComuBajaDTO } from '../dto/create-comunicacion_baja';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { InvoiceGateway } from '../gateway/invoice.gateway';
import { uid } from 'rand-token';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoiceService {
  private logger = new Logger('InvoiceService');

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
    @InjectRepository(AnulacionEntity)
    private anulacionRepository: Repository<AnulacionEntity>,
    private readonly invoiceGateway: InvoiceGateway,
  ) {
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.tz.setDefault('America/Lima'); // Establecer el huso horario de Perú como predeterminado
  }

  async bajaAux(empresaId: number, establecimientoId: number) {
    const empresa = await this.empresaService.findOneEmpresaById(
      empresaId,
      true,
    );
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        establecimientoId,
      );

    const dataXML = {
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
      tipo_documento: '01',
      serie: 'F001',
      correlativo: '3',
      fecha_emision: new Date(),
      fecha_comunicacion: new Date(),
      motivo: 'Error en la operacion',
      correlativoBaja: '00001',
    };

    //GENERAMOS XML
    const xmlBaja = await axios.post(
      `${process.env.API_SERVICE_PHP}/gen-xml-baja`,
      dataXML,
    );

    const { fileName, xml } = xmlBaja.data;

    //Verificamos si el cliente esta en modo beta o produccion
    const certFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/produccion/${empresa.ruc}/${empresa.cert}`,
    );

    //Generamos el certificado.pem para firmar
    const pemFilePath = path.join(
      process.cwd(),
      `uploads/certificado_digital/produccion/${empresa.ruc}/${empresa.fieldname_cert}.pem`,
    );

    const certificado = this.convertToPem(
      certFilePath,
      pemFilePath,
      empresa.cert_password,
    );

    //FIRMAMOS XML
    const xmlSigned = await this.firmar(xml, certificado);

    //PREPARAMOS OBJ PARA IDENTIFICARNOS Y GENERAR TICKET
    const dataIdentify = {
      urlService: empresa.web_service,
      usuario: empresa.ose_enabled
        ? empresa.usu_secundario_ose_user
        : empresa.usu_secundario_user,
      contrasenia: empresa.ose_enabled
        ? empresa.usu_secundario_ose_password
        : empresa.usu_secundario_password,
      fileName: fileName,
      contentFile: xmlSigned,
    };

    //GENERAMOS TICKET DE SUNAT
    const resa = await axios.post(
      `${process.env.API_SERVICE_PHP}/gen-ticket-baja`,
      dataIdentify,
    );

    const ticket = resa.data.ticket;

    await setTimeout(2000);

    const dataIdentifyTicket = {
      urlService: empresa.web_service,
      usuario: empresa.ose_enabled
        ? empresa.usu_secundario_ose_user
        : empresa.usu_secundario_user,
      contrasenia: empresa.ose_enabled
        ? empresa.usu_secundario_ose_password
        : empresa.usu_secundario_password,
      ticket: ticket,
    };

    const res = await axios.post(
      `${process.env.API_SERVICE_PHP}/sendSunatBaja`,
      dataIdentifyTicket,
    );

    console.log(res.data);
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
      codigo_respuesta_sunat: null | number;
      documento: string;
      serie: string;
      total: string;
      correlativo: string;
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

          const DECIMAL = 6;

          const item: InvoiceDetailsEntity = {
            id: producto.id,
            unidad, // Unidad - Catalog. 03
            tipAfeIgv, // Gravado Op. Onerosa - Catalog. 07
            codigo: producto.codigo,
            cantidad: producto.cantidad,
            producto: producto.descripcion,
            mtoValorUnitario: round(producto.mtoValorUnitario, DECIMAL),
            porcentajeIgv: producto.porcentajeIgv,
          };

          const ALL_GRATUITAS = [
            '11',
            '12',
            '13',
            '14',
            '15',
            '16',
            '17',
            '21',
            '31',
            '32',
            '33',
            '34',
            '35',
            '36',
            '37',
          ];

          if (ALL_GRATUITAS.includes(producto.tipAfeIgv)) {
            item['mtoValorGratuito'] = round(
              producto.mtoValorUnitario,
              DECIMAL,
            );

            item['mtoValorUnitario'] = 0;
          }

          return item;
        });

        const todosProductos = await Promise.all(productos);

        const calcOperaciones = this.obtenerOperacionesInvoice(todosProductos);

        //BUSCAREMOS EL INVOICE PARA SABER SI EXSITE O NO, SI EXISTE ACTUALIZAMOS BORRADOR DE LO CONTRARIO CREAMOS
        const getInvoice = await this.findOneInvoiceById(invoice.id);
        console.log(
          'validar',
          getInvoice,
          invoice.borrador,
          invoice.serie,
          serie.numeroConCeros,
          invoice.numero,
        );
        const myObjCreate = {
          tipo_operacion: invoice.tipo_operacion,
          tipo_doc: tipoDocumento,
          serie:
            getInvoice && invoice.borrador //Si existe un borrador y sigue guardando como borrador
              ? getInvoice.serie !== invoice.serie //Si la serie es diferente a la que se esta guardando
                ? invoice.serie //Guardamos la nueva serie
                : getInvoice.serie //Si no guardamos la serie actual
              : invoice.serie, //Si no guardamos la serie actual
          correlativo:
            getInvoice && invoice.borrador //Si existe un borrador y sigue guardando como borrador
              ? getInvoice.serie !== invoice.serie //Si la serie es diferente a la que se esta guardando
                ? serie.numeroConCeros //Guardamos el nuevo correlativo
                : getInvoice.correlativo //Si no guardamos el correlativo actual
              : getInvoice && !invoice.borrador
              ? invoice.numero
              : serie.numeroConCeros, //Si no guardamos el correlativo actual
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
          porcentaje_igv: 18,
          entidad: existPermisoRegCliente ? null : invoice.cliente,
          entidad_tipo: existPermisoRegCliente ? null : invoice.tipo_entidad,
          entidad_documento: existPermisoRegCliente ? null : invoice.ruc,
          entidad_direccion: existPermisoRegCliente ? null : invoice.direccion,
          borrador: invoice.borrador,
        };

        //Obj para invoice
        let invoiceObj = this.invoiceRepository.create(myObjCreate);
        console.log('entra', invoiceObj.id);
        if (getInvoice) {
          //No se permite actualizar un cpe valido o que no sea borrador
          if (!getInvoice.borrador) {
            throw new HttpException(
              'No puedes modificar un CPE ya emitido.',
              HttpStatus.BAD_REQUEST,
            );
          }

          //UPDATE INVOICE
          await entityManager.update(
            InvoiceEntity,
            { id: getInvoice.id },
            invoiceObj,
          );

          invoiceObj = {
            id: getInvoice.id,
            ...invoiceObj,
          };

          const currentProducts = await this.invoiceDetailsRepository.find({
            relations: {
              invoice: true,
            },
            where: {
              invoice: {
                id: Equal(getInvoice.id),
              },
            },
          });

          // Crear un mapa para los productos actuales usando el id
          const currentProductsMap = new Map(
            currentProducts.map((product) => [product.id, product]),
          );

          //Validamos que ningun producto que se este modificando no sea de otro cpe
          for (let index = 0; index < todosProductos.length; index++) {
            const product = todosProductos[index];

            if (product.id) {
              const findProduct = await this.invoiceDetailsRepository.findOne({
                relations: {
                  invoice: true,
                },
                where: {
                  id: Equal(product.id),
                },
              });

              if (findProduct.invoice.id !== getInvoice.id) {
                throw new HttpException(
                  'No puedes modificar este producto.',
                  HttpStatus.BAD_REQUEST,
                );
              }
            }
          }

          // Crear un mapa para los nuevos productos
          const newProductsMap = new Map(
            todosProductos.map((product) => [product.id, product]),
          );

          // Iterar sobre los productos actuales para ver cuáles eliminar
          for (const currentProduct of currentProducts) {
            if (!newProductsMap.has(currentProduct.id)) {
              // Si el producto actual no está en la lista de nuevos productos, eliminarlo
              await entityManager.delete(
                InvoiceDetailsEntity,
                currentProduct.id,
              );
            }
          }

          // Iterar sobre los nuevos productos para ver cuáles agregar o actualizar
          for (const newProduct of todosProductos) {
            if (currentProductsMap.has(newProduct.id)) {
              // Si el producto nuevo ya existe, actualizarlo
              await entityManager.update(
                InvoiceDetailsEntity,
                { id: newProduct.id },
                newProduct,
              );
            } else {
              // Si el producto nuevo no existe, agregarlo
              const objDetail = this.invoiceDetailsRepository.create({
                ...newProduct,
                invoice: getInvoice,
              });

              //Guardamos detalle del invoice
              await entityManager.save(InvoiceDetailsEntity, objDetail);
            }
          }
        } else {
          console.log('entra2vv', invoiceObj.id);
          //CREAR INVOICE
          const invoiceSave = await entityManager.save(
            InvoiceEntity,
            invoiceObj,
          );
          console.log('entra2xv', invoiceObj.id);
          for (let index = 0; index < todosProductos.length; index++) {
            const producto = todosProductos[index];
            //Creamos el detalle del invoice
            const objDetail = this.invoiceDetailsRepository.create({
              ...producto,
              invoice: invoiceSave,
            });
            //Guardamos detalle del invoice
            await entityManager.save(InvoiceDetailsEntity, objDetail);
          }
        }

        const genXML = await this.generarXML(
          invoiceObj,
          invoiceObj.empresa,
          invoiceObj.establecimiento,
          calcOperaciones,
          todosProductos,
        );
        console.log('entra2xxxx', invoiceObj.id);
        const { xml, fileName } = genXML;

        //Guardamos el XML en el directorio del cliente
        this.guardarArchivo(
          invoiceObj.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/XML`,
          `${fileName}.xml`,
          xml,
          true,
        );

        const certificado = this.validarCertificado(invoiceObj);
        console.log('entra2xxx', invoiceObj.id);
        //Firmar XML de nuestra api en PHP
        const xmlSigned = await this.firmar(xml, certificado);

        //Guardamos el XML Firmado en el directorio del cliente
        this.guardarArchivo(
          invoiceObj.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/FIRMA`,
          `${fileName}.xml`,
          xmlSigned,
          true,
        );
        console.log('entra2xx', invoiceObj.id);
        //formatemos el invoice solo para mostrar lo necesario
        const invoiceView = this.formatListInvoices(
          invoiceObj,
          null,
          todosProductos,
        );

        let codigo_respuesta_sunat = null;
        console.log('entra2x', invoiceObj.id);
        if (invoiceObj.borrador) {
          this.logger.log(
            `El usuario ${usuario.username} está creando un CPE como borrador...`,
          );

          //Notificamos que se ha creado un CPE pero no se ha enviado a sunat
          this.logger.log(
            `NO está enviando CPE ${invoiceObj.correlativo} a sunat por ser borrador.`,
          );

          this.invoiceGateway.server
            .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
            .emit('server::newInvoice', {
              ...invoiceView,
            });
        } else {
          //Si el documento no es un borrador verificamos si tiene la opcion de enviar a sunat inmeidatamente o no
          this.logger.log(
            `El usuario ${usuario.username} está creando un CPE...`,
          );

          //Envia sunat segun sus configuraciones
          const configuraciones = establecimiento.configsEstablecimiento;
          if (
            configuraciones.some(
              (config) => config.enviar_inmediatamente_a_sunat,
            )
          ) {
            console.log('entra22', invoiceView);
            console.log('entra2', invoiceObj.id);
            //Cambiamos el estado de creado a enviando
            await entityManager.update(
              InvoiceEntity,
              { id: invoiceObj.id },
              { estado_operacion: 1 },
            );

            //Notificamos que estamos enviando a sunat
            this.invoiceGateway.server
              .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
              .emit('server::newInvoice', {
                ...invoiceView,
                estado_operacion: 1,
              });

            this.logger.log(
              `El usuario ${usuario.username} esta enviando a sunat con nro de cpe: ${fileName}`,
            );

            let sunat = null;

            try {
              //Enviamos a sunat
              sunat = await this.enviarSunat(
                invoiceObj.empresa.web_service,
                invoiceObj.empresa.ose_enabled
                  ? invoiceObj.empresa.usu_secundario_ose_user
                  : invoiceObj.empresa.usu_secundario_user,
                invoiceObj.empresa.ose_enabled
                  ? invoiceObj.empresa.usu_secundario_ose_password
                  : invoiceObj.empresa.usu_secundario_password,
                fileName,
                xmlSigned,
              );
            } catch (e) {
              const code = Number(e.response.code);
              if (
                (code >= 100 && code <= 999) ||
                e.response.code === 'HTTP' ||
                e.response.code === 'http'
              ) {
                const message = e.response.message;
                this.logger.warn(
                  `Hoy, ${dayjs()}, se presenta intermitencia en los servidores de la SUNAT - [${code}]:${message}`,
                );
                this.logger.warn(
                  `Usuario ${usuario.username} sunat tiene problemas el ${fileName} sera enviado pronto...`,
                );

                this.invoiceGateway.server
                  .to(
                    `room_invoices_emp-${empresa.id}_est-${establecimiento.id}`,
                  )
                  .emit('server::notifyInvoice', {
                    type: 'sunat.success',
                    correlativo: invoiceObj.correlativo,
                    time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                    message: `Comprobante ${fileName} ha sido creado.`,
                  });

                //Actualizamos serie
                await entityManager.save(SeriesEntity, {
                  ...serie,
                  numero: String(Number(serie.numero) + 1),
                });

                return {
                  invoice: invoiceObj,
                  fileName,
                  codigo_respuesta_sunat: code,
                  documento:
                    tipoDocumento.tipo_documento.toUpperCase() +
                    ' ' +
                    'ELECTRÓNICA',
                  serie: invoiceObj.serie,
                  correlativo: invoiceObj.correlativo,
                  total:
                    tipoMoneda.simbolo +
                    String(
                      invoiceObj.mto_operaciones_gravadas +
                        invoiceObj.mto_operaciones_exoneradas +
                        invoiceObj.mto_operaciones_exportacion +
                        invoiceObj.mto_operaciones_gratuitas +
                        invoiceObj.mto_operaciones_inafectas +
                        invoiceObj.mto_igv,
                    ),
                };
              }
              //Errores al conectar con el servicio sunat o sunat respondera con eres del 1000-1999
              else {
                throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
              }
            }

            //Si hay conexion y repuesta de sunat descargamos CDR
            const { cdrZip, codigo_sunat, mensaje_sunat, observaciones_sunat } =
              sunat.data;

            codigo_respuesta_sunat = codigo_sunat;

            const observaciones_sunat_modified =
              (observaciones_sunat as [])?.length > 0
                ? observaciones_sunat.join('|')
                : null;

            //Decodificamos el CDR en base64 (LA RESPUESTA DE SUNAT)
            const CdrZip = Buffer.from(cdrZip, 'base64');

            //Guardamos el CDR en el servidor en el directorio del cliente
            this.guardarArchivo(
              invoiceObj.empresa.ruc,
              `${invoiceObj.establecimiento.codigo}/${invoiceObj.tipo_doc.tipo_documento}/RPTA`,
              `R-${fileName}.zip`,
              CdrZip,
              true,
            );

            if (codigo_sunat === 0) {
              //Cambiamos el estado de enviado a aceptado
              await entityManager.update(
                InvoiceEntity,
                { id: invoiceObj.id },
                {
                  estado_operacion: 2,
                  respuesta_sunat_codigo: codigo_sunat,
                  respuesta_sunat_descripcion: mensaje_sunat,
                  observaciones_sunat: observaciones_sunat_modified,
                },
              );

              const _invoice = this.formatListInvoices(
                {
                  ...invoiceObj,
                  estado_operacion: 2,
                  respuesta_sunat_codigo: codigo_sunat,
                  respuesta_sunat_descripcion: mensaje_sunat,
                  observaciones_sunat: observaciones_sunat_modified,
                },
                null,
                todosProductos,
              );

              //Notificamos a los clientes que se acepto a sunat
              this.logger.log(`${usuario.username} - ${mensaje_sunat}`);

              this.invoiceGateway.server
                .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
                .emit('server::notifyInvoice', {
                  type: 'sunat.success',
                  correlativo: invoiceObj.correlativo,
                  time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                  message: `${mensaje_sunat}`,
                });

              this.invoiceGateway.server
                .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
                .emit('server::newInvoice', _invoice);
            } else if (codigo_sunat >= 2000 && codigo_sunat <= 3999) {
              //Cambiamos el estado de enviado a rechazado
              await entityManager.update(
                InvoiceEntity,
                { id: invoiceObj.id },
                {
                  estado_operacion: 3,
                  respuesta_sunat_codigo: codigo_sunat,
                  respuesta_sunat_descripcion: mensaje_sunat,
                  observaciones_sunat: observaciones_sunat_modified,
                },
              );

              const _invoice = this.formatListInvoices(
                {
                  ...invoiceObj,
                  estado_operacion: 3,
                  respuesta_sunat_codigo: codigo_sunat,
                  respuesta_sunat_descripcion: mensaje_sunat,
                  observaciones_sunat: observaciones_sunat_modified,
                },
                null,
                todosProductos,
              );

              //Notificamos a los clientes que sunat rechazo el cpe
              this.logger.error(
                `${fileName} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
              );

              this.invoiceGateway.server
                .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
                .emit('server::notifyInvoice', {
                  type: 'sunat.failed',
                  correlativo: invoiceObj.correlativo,
                  time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                  message: `${fileName} fue rechazado por SUNAT - ${codigo_sunat}:${mensaje_sunat}.`,
                });

              this.invoiceGateway.server
                .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
                .emit('server::newInvoice', _invoice);
            } else {
              //probablemente no entre aca
              this.logger.warn(`Warning:${mensaje_sunat}.`);

              this.invoiceGateway.server
                .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
                .emit('server::notifyInvoice', {
                  type: 'sunat.warn',
                  correlativo: invoiceObj.correlativo,
                  time: dayjs(new Date()).format('DD-MM-YYYY·HH:mm:ss'),
                  message: `El CPE#${invoiceObj.correlativo}  -  Warning:${mensaje_sunat}.`,
                });
            }
          } else {
            //Notificamos que se ha creado un CPE pero no se ha enviado a sunat
            this.logger.log(
              `NO está enviando CPE ${invoiceObj.correlativo} a sunat.`,
            );

            this.invoiceGateway.server
              .to(`room_invoices_emp-${empresa.id}_est-${establecimiento.id}`)
              .emit('server::newInvoice', {
                ...invoiceView,
              });
          }
        }

        //Creamos el pdf A4
        this.getPdf(
          invoiceObj.empresa.ruc,
          `${establecimiento.codigo}/${tipoDocumento.tipo_documento}/PDF/A4`,
          fileName,
          docDefinitionA4,
        );

        //Solo actualizamos series cuando un cpe es nuevo
        if (!getInvoice) {
          //Actualizamos serie
          await entityManager.save(SeriesEntity, {
            ...serie,
            numero: String(Number(serie.numero) + 1),
          });
        }

        return {
          invoice: invoiceObj,
          fileName,
          codigo_respuesta_sunat,
          documento:
            tipoDocumento.tipo_documento.toUpperCase() + ' ' + 'ELECTRÓNICA',
          serie: invoiceObj.serie,
          //correlativo: invoiceObj.correlativo,
          correlativo: getInvoice
            ? String(Number(serie.numero))
            : String(Number(serie.numero) + 1),
          total:
            tipoMoneda.simbolo +
            String(
              invoiceObj.mto_operaciones_gravadas +
                invoiceObj.mto_operaciones_exoneradas +
                invoiceObj.mto_operaciones_exportacion +
                invoiceObj.mto_operaciones_gratuitas +
                invoiceObj.mto_operaciones_inafectas +
                invoiceObj.mto_igv,
            ),
        };
      });
    } catch (e) {
      console.log('error create', e);
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

  async updateEstadoOperacionAnulacion(idInvoice: number, estado: number) {
    try {
      await this.invoiceRepository.update(idInvoice, {
        estado_anulacion: estado,
      });

      return this.invoiceRepository.findOne({ where: { id: idInvoice } });
    } catch (e) {
      throw new HttpException(
        'Error al actualizar el estado de la anulación',
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
          const mtoValorUnitario = round(producto.mtoValorUnitario);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: round(mtoPrecioUnitario),
          };

          acc.push(objProduct);
        }

        //exonerada onerosa
        if (producto.tipAfeIgv.codigo === '20') {
          const mtoValorUnitario = round(producto.mtoValorUnitario);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: round(mtoPrecioUnitario),
          };

          acc.push(objProduct);
        }

        //inafecto onerosa
        if (producto.tipAfeIgv.codigo === '30') {
          const mtoValorUnitario = round(producto.mtoValorUnitario);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: round(mtoPrecioUnitario),
          };

          acc.push(objProduct);
        }

        //exportacion
        if (producto.tipAfeIgv.codigo === '40') {
          const mtoValorUnitario = round(producto.mtoValorUnitario);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
            mtoPrecioUnitario: round(mtoPrecioUnitario),
          };

          acc.push(objProduct);
        }

        //gravadas gratuitas
        if (
          ['11', '12', '13', '14', '15', '16', '17'].includes(
            producto.tipAfeIgv.codigo,
          )
        ) {
          const mtoValorGratuito = round(producto.mtoValorGratuito);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
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
          const mtoValorGratuito = round(producto.mtoValorGratuito);
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
            mtoValorVenta: round(mtoValorVenta),
            mtoBaseIgv: round(mtoBaseIgv),
            porcentajeIgv: porcentajeIgv,
            igv: round(igv),
            tipAfeIgv: producto.tipAfeIgv.codigo,
            totalImpuestos: round(totalImpuestos),
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
      LegendValue: numeroALetras(calcOperaciones.mtoImpVenta),
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
    } catch (e) {
      if (e.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Verifique el servidor de la API Greenter actualmente esta deshabilitado.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        {
          sendSunat: true,
          code: e.response.data?.error?.code,
          message: `Error de comunicación con el servicio: sunat.enviarSunat - [${
            e.response.data?.error?.code
          }]:${e.response.data?.error?.message ?? 'Internal'}`,
        },
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

  //para facturas
  async comunicarBaja(
    invoice: InvoiceEntity,
    motivo: string,
    correlativoBaja: string,
  ) {
    const certificado = this.validarCertificado(invoice);

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

      const { fileName, fileNameExtension, xml } = xmlBaja.data;

      //GUARDAMOS XML
      this.guardarArchivo(
        invoice.empresa.ruc,
        `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/XML`,
        `${fileNameExtension}`,
        xml,
        true,
      );

      //FIRMAMOS XML
      const xmlSigned = await this.firmar(xml, certificado);

      //GUARDAMOS XML FIRMADO
      this.guardarArchivo(
        invoice.empresa.ruc,
        `${invoice.establecimiento.codigo}/${invoice.tipo_doc.tipo_documento}/BAJA/FIRMA`,
        `${fileNameExtension}`,
        xmlSigned,
        true,
      );

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

      //GENERAMOS TICKET DE SUNAT
      const res = await axios.post(
        `${process.env.API_SERVICE_PHP}/gen-ticket-baja`,
        dataIdentify,
      );

      return {
        numero: res.data.ticket,
        fileName: fileName,
        fecha_comunicacion: dataXML.fecha_comunicacion,
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
        `Error al comunicar la baja InvoiceService.comunicarBaja - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async enviarSunatTicket(invoice: InvoiceEntity, ticket: string) {
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
        `Error de comunicación con el servicio: sunat.enviarSunatTicket - ${
          e.response?.data ? message : 'Internal'
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async findOneInvoiceById(idInvoice: number) {
    let invoice: InvoiceEntity = null;

    try {
      invoice = await this.invoiceRepository.findOne({
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
          id: Equal(idInvoice),
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al buscar la factura InvoiceService.findOneInvoiceById',
        HttpStatus.BAD_REQUEST,
      );
    }

    return invoice;
  }

  async findOneInvoice(
    serie: string,
    numero: string,
    empresa: number,
    establecimiento: number,
  ) {
    let invoice: InvoiceEntity = null;

    try {
      invoice = await this.invoiceRepository.findOne({
        relations: {
          tipo_moneda: true,
          forma_pago: true,
          tipo_doc: true,
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
          usuario: true,
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

    // if (!invoice) {
    //   throw new HttpException('El CPE no existe.', HttpStatus.BAD_REQUEST);
    // }

    return invoice;
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
          cliente: {
            tipo_entidad: true,
          },
          empresa: true,
          establecimiento: true,
          tipo_moneda: true,
          forma_pago: true,
          usuario: true,
          invoices_details: {
            tipAfeIgv: true,
            unidad: true,
          },
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

      const items = invoices.map(async (invoice) => {
        const ruc = invoice.empresa.ruc;
        const tipoDoc = invoice.tipo_doc.codigo;
        const nomDoc = invoice.tipo_doc.tipo_documento;
        const serie = invoice.serie;
        const correlativo = invoice.correlativo;
        const establecimiento = `${invoice.establecimiento.codigo}`;

        let pathDirFirma = '';
        let pathDirCDR = '';
        let pathStaticFirma = '';
        let pathStaticCDR = '';

        //null(no enviado), 1(enviado con ticket), 2(anulacion aceptado), 3(anulacion rechazada)
        if (invoice.estado_anulacion === 2) {
          const anulacion = await this.anulacionRepository.findOneBy({
            invoice: { id: invoice.id },
          });

          if (anulacion) {
            const fechaAnulacion = dayjs(anulacion.fecha_comunicacion).format(
              'YYYYMMDD',
            );
            const correlativoAnulacion = anulacion.numero;
            const fileName = `${ruc}-RA-${fechaAnulacion}-${correlativoAnulacion}`;

            const rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/BAJA/FIRMA/${fileName}.xml`;
            const rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/BAJA/RPTA/R-${fileName}.zip`;
            pathDirFirma = path.join(
              process.cwd(),
              `uploads/files/${rutaFirma}`,
            );

            pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

            pathStaticFirma = `${urlStatic}/${rutaFirma}`;
            pathStaticCDR = `${urlStatic}/${rutaCDR}`;
          }
        }
        //0(creado), 1(enviando), 2(aceptado), 3(rechazado)
        else if (
          invoice.estado_operacion === 0 ||
          invoice.estado_operacion === 2 ||
          invoice.estado_operacion === 3
        ) {
          const fileName = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
          const rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileName}.xml`;
          const rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileName}.zip`;
          pathDirFirma = path.join(process.cwd(), `uploads/files/${rutaFirma}`);

          pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

          pathStaticFirma = `${urlStatic}/${rutaFirma}`;
          pathStaticCDR = `${urlStatic}/${rutaCDR}`;
        } else {
        }

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

        //dayjs(invoice.createdAt).format('DD-MM-YYYY·HH:mm:ss',)

        return {
          ...rest,
          cliente: invoice.cliente
            ? {
                id: invoice.cliente.id,
                entidad: rest.cliente.entidad,
                nombre_comercial: invoice.cliente.nombre_comercial,
                numero_documento: invoice.cliente.numero_documento,
                estado: invoice.cliente.estado,
                direccion: invoice.cliente.direccion,
                tipo_entidad: invoice.cliente.tipo_entidad.codigo,
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
          xml: !fs.existsSync(pathDirFirma) ? '#' : `${pathStaticFirma}`,
          cdr: !fs.existsSync(pathDirCDR) ? '#' : `${pathStaticCDR}`,
          pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/${'test'}.pdf`,
          usuario: invoice.usuario.nombres + ' ' + invoice.usuario.apellidos,
          moneda: invoice.tipo_moneda,
          fecha_registro: invoice.createdAt,
          fecha_emision: invoice.fecha_emision,
          productos: invoice.invoices_details.map((item, i) => {
            if (item.mtoValorGratuito) {
              const igvUnitario =
                (item.mtoValorGratuito * item.porcentajeIgv) / 100;
              const precioUnitarioGratuito =
                item.mtoValorGratuito + igvUnitario;
              const mtoValorVenta = item.mtoValorGratuito * item.cantidad;
              const igvTotal = igvUnitario * item.cantidad;

              const itemObj = {
                id: item.id,
                posicionTabla: i,
                uuid: uuidv4(),
                cantidad: item.cantidad,
                codigo: item.codigo,
                descripcion: item.producto,
                //igv: Number(igvTotal).toFixed(2),
                //igvUnitario: Number(igvUnitario).toFixed(2),
                //mtoBaseIgv: Number(mtoValorVenta).toFixed(2),
                //mtoPrecioUnitario: Number(0).toFixed(3),
                //mtoTotalItem: Number(0).toFixed(2),
                //mtoValorGratuito: Number(item.mtoValorGratuito).toFixed(3),
                mtoValorUnitario: item.mtoValorUnitario,
                //mtoValorVenta: Number(mtoValorVenta).toFixed(2),
                porcentajeIgv: Number(item.porcentajeIgv),
                tipAfeIgv: item.tipAfeIgv.codigo,
                //totalImpuestos: Number(igvTotal).toFixed(2),
                unidad: item.unidad.codigo,
              };

              //gravadas gratuitas
              if (
                ['11', '12', '13', '14', '15', '16', '17'].includes(
                  item.tipAfeIgv.codigo,
                )
              ) {
                itemObj['mtoPrecioUnitarioGratuito'] = round(
                  precioUnitarioGratuito,
                );
              }

              return itemObj;
            } else {
              const igvUnitario =
                (item.mtoValorUnitario * item.porcentajeIgv) / 100;
              const igvTotal = igvUnitario * item.cantidad;

              const precioUnitario = item.mtoValorUnitario + igvUnitario;
              const mtoValorVenta = item.mtoValorUnitario * item.cantidad;

              const mtoTotalItem = precioUnitario * item.cantidad;

              return {
                id: item.id,
                posicionTabla: i,
                uuid: uuidv4(),
                cantidad: item.cantidad,
                codigo: item.codigo,
                descripcion: item.producto,
                //igv: Number(igvTotal).toFixed(2),
                //igvUnitario: Number(igvUnitario).toFixed(2),
                //mtoBaseIgv: Number(mtoValorVenta).toFixed(2),
                //mtoPrecioUnitario: Number(precioUnitario).toFixed(3),
                //mtoTotalItem: Number(mtoTotalItem).toFixed(2),
                mtoValorUnitario: item.mtoValorUnitario,
                //mtoValorVenta: Number(mtoValorVenta).toFixed(2),
                porcentajeIgv: Number(item.porcentajeIgv),
                tipAfeIgv: item.tipAfeIgv.codigo,
                //totalImpuestos: Number(igvTotal).toFixed(2),
                unidad: item.unidad.codigo,
              };
            }
          }),
        };
      });

      return {
        statusCode: 'success',
        total: countInvoices,
        currentPage: Number(page),
        nextPage: nextPage,
        prevPage: prevPage,
        totalPage: totalPage,
        items: await Promise.all(items),
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
            ((producto.mtoValorGratuito * producto.porcentajeIgv) / 100) *
              producto.cantidad,
          );

          const opeGratuitas = round(
            producto.mtoValorGratuito * producto.cantidad,
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

  formatListInvoices(
    invoice: InvoiceEntity,
    fileName?: string,
    todosProductos?: InvoiceDetailsEntity[],
  ) {
    //formateamos result
    const urlStatic = this.configService.get<string>('URL_FILES_STATIC');
    const ruc = invoice.empresa.ruc;
    const tipoDoc = invoice.tipo_doc.codigo;
    const nomDoc = invoice.tipo_doc.tipo_documento;
    const serie = invoice.serie;
    const correlativo = invoice.correlativo;
    const establecimiento = `${invoice.establecimiento.codigo}`;

    let pathDirFirma = '';
    let pathDirCDR = '';
    let pathStaticFirma = '';
    let pathStaticCDR = '';

    //null(no enviado), 1(enviado con ticket), 2(anulacion aceptado), 3(anulacion rechazada)
    if (invoice.estado_anulacion === 2) {
      const rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/BAJA/FIRMA/${fileName}.xml`;
      const rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/BAJA/RPTA/R-${fileName}.zip`;
      pathDirFirma = path.join(process.cwd(), `uploads/files/${rutaFirma}`);

      pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

      pathStaticFirma = `${urlStatic}/${rutaFirma}`;
      pathStaticCDR = `${urlStatic}/${rutaCDR}`;
    }
    //0(creado), 1(enviando), 2(aceptado), 3(rechazado)
    else if (
      invoice.estado_operacion === 0 ||
      invoice.estado_operacion === 2 ||
      invoice.estado_operacion === 3
    ) {
      const fileNameAux = `${ruc}-${tipoDoc}-${serie}-${correlativo}`;
      const rutaFirma = `${ruc}/${establecimiento}/${nomDoc}/FIRMA/${fileNameAux}.xml`;
      const rutaCDR = `${ruc}/${establecimiento}/${nomDoc}/RPTA/R-${fileNameAux}.zip`;
      pathDirFirma = path.join(process.cwd(), `uploads/files/${rutaFirma}`);

      pathDirCDR = path.join(process.cwd(), `uploads/files/${rutaCDR}`);

      pathStaticFirma = `${urlStatic}/${rutaFirma}`;
      pathStaticCDR = `${urlStatic}/${rutaCDR}`;
    } else {
    }

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
            direccion: invoice.cliente.direccion,
            tipo_entidad: invoice.cliente.tipo_entidad.codigo,
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
      xml: !fs.existsSync(pathDirFirma) ? '#' : `${pathStaticFirma}`,
      cdr: !fs.existsSync(pathDirCDR) ? '#' : `${pathStaticCDR}`,
      pdfA4: `${urlStatic}/${ruc}/${establecimiento}/${nomDoc}/PDF/A4/${'test'}.pdf`,
      usuario: invoice.usuario.nombres + ' ' + invoice.usuario.apellidos,
      moneda: invoice.tipo_moneda,
      fecha_registro: invoice.createdAt,
      fecha_emision: invoice.fecha_emision,
      productos: todosProductos.map((item) => {
        const igvUnitario = item.mtoValorUnitario * item.porcentajeIgv;
        const precioUnitario = item.mtoValorUnitario + igvUnitario;
        return {
          cantidad: item.cantidad,
          codigo: item.codigo,
          descripcion: item.producto,
          igv: Number(igvUnitario * item.cantidad).toFixed(2),
          igvUnitario: Number(igvUnitario).toFixed(2),
          mtoBaseIgv: Number(item.mtoValorUnitario * item.cantidad).toFixed(2),
          mtoPrecioUnitario: Number(precioUnitario).toFixed(3),
          mtoTotalItem: Number(precioUnitario * item.cantidad).toFixed(2),
          mtoValorUnitario: Number(item.mtoValorUnitario).toFixed(3),
          mtoValorVenta: Number(item.mtoValorUnitario * item.cantidad).toFixed(
            2,
          ),
          porcentajeIgv: Number(item.porcentajeIgv),
          tipAfeIgv: item.tipAfeIgv.codigo,
          totalImpuestos: Number(igvUnitario * item.cantidad).toFixed(2),
          unidad: item.unidad.codigo,
        };
      }),
    };
  }
}
