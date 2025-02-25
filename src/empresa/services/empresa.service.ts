import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Equal } from 'typeorm';
import { EmpresaEntity } from '../entities/empresa.entity';
import * as fs from 'fs';
import path from 'path';
import { QueryToken } from 'src/auth/dto/queryToken';
import {
  DEPARTAMENTOS,
  DISTRITOS,
  PROVINCIAS,
  ROL_PRINCIPAL,
} from 'src/lib/const/consts';
import { UserService } from 'src/user/services/user.service';
import { EmpresaListDTO } from '../dto/queryEmpresas.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { CreateEmpresaDTO } from '../dto/create-empresa.dto';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { Request } from 'express';
import { UpdateEmpresaDTO } from '../dto/update-empresa.dto';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { EmpresaDetailDTO } from '../dto/queryEmpresa.dto';
import { ConfigService } from '@nestjs/config';
import { PosService } from 'src/pos/services/pos.service';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(EmpresaEntity)
    private empresaRepository: Repository<EmpresaEntity>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private tipodocService: TipodocsService,
    @InjectRepository(TipodocsEmpresaEntity)
    private documentRepository: Repository<TipodocsEmpresaEntity>,
    @InjectRepository(EstablecimientoEntity)
    private establecimientoRepository: Repository<EstablecimientoEntity>,
    private dataSource: DataSource,
    private establecimientoService: EstablecimientoService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly posService: PosService,
  ) {}

  async createEmpresa(body: {
    data: CreateEmpresaDTO;
    files: any;
  }): Promise<EmpresaListDTO> {
    //Verficamos si la empresa ya existe
    const findEmpresa = await this.empresaRepository.findOne({
      where: {
        ruc: body.data.ruc,
      },
    });

    if (findEmpresa) {
      throw new HttpException(
        'No puedes crear una empresa que ya existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //modo 1 = producción
    if (body.data.modo === 1 && !body.files?.certificado) {
      throw new HttpException(
        'En modo producción la empresa debe contener un certificado digital válido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Buscar usuario en mysql
    const userMYSQL = await this.userService.findOneUserById_MYSQL(
      body.data.usuario,
    );

    if (!userMYSQL) {
      throw new HttpException(
        'No se encontró usuario o no existe EmpresaService.findOne.',
        HttpStatus.NOT_FOUND,
      );
    }

    //Usuario en mongo debe estar activo
    const userMONGO = await this.userModel.findById(userMYSQL._id);
    if (!userMONGO.status) {
      throw new HttpException(
        'El usuario no se encuentra activo.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const result = await this.dataSource.transaction(
        async (entityManager) => {
          const fileName_cert_timestamp = this.crearCert(
            body.data.ruc,
            body.data.modo,
            body.files.certificado,
          );

          //Creamos empresa
          const createEmpresa = this.empresaRepository.create({
            ...body.data,
            logo: body.files?.logo
              ? body.files.logo.originalname
              : 'logo_default.png', //file logo empresa
            usuario: userMYSQL,
            web_service:
              body.data.modo === 0 //0 = beta
                ? 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
                : body.data.ose_enabled
                ? body.data.web_service
                : 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService', //1 = url produccion
            cert: body.files?.certificado
              ? fileName_cert_timestamp
              : 'certificado_beta.pfx', //file certificado
            fieldname_cert: body.files?.certificado
              ? body.files.certificado.originalname.substring(
                  0,
                  body.files.certificado.originalname.lastIndexOf('.'), //obtenermos el nombre del certificado
                )
              : 'certificado_beta',
            cert_password:
              body.data.modo === 0 ? '123456' : body.data.cert_password,
            usu_secundario_user:
              body.data.modo === 0
                ? '20000000001MODDATOS'
                : body.data.ruc + body.data.usu_secundario_user,
            usu_secundario_password:
              body.data.modo === 0
                ? 'moddatos'
                : body.data.usu_secundario_password,
            usu_secundario_ose_user: body.data.ose_enabled
              ? body.data.usu_secundario_ose_user
              : '',
            usu_secundario_ose_password: body.data.ose_enabled
              ? body.data.usu_secundario_ose_password
              : '',
          });

          //Guardar empresa
          const empresa = await entityManager.save(
            EmpresaEntity,
            createEmpresa,
          );

          /**
           * Se guardara el logo con su directorio principal de la empresa y tambien
           * se creara el mismo logo para el establecimiento por defecto(0000)
           */
          if (body.files.logo) {
            this.crearLogo(body.data.ruc, body.files.logo);
            this.crearLogo(empresa.ruc, body.files.logo, `0000/IMAGES/LOGO`);
          }

          //Si tiene documentos el body ingresamos para agregar y crear documentos
          for (let index = 0; index < body.data.documentos.length; index++) {
            const tipo = body.data.documentos[index].id;
            const nombreDocumento = body.data.documentos[index].nombre;
            const getTipoDoc = await this.tipodocService.findOneTipoDocById(
              tipo,
            );

            //Si el tipo de documento esta inactivo lo omitimos y solo agregamos los activos
            if (getTipoDoc && getTipoDoc.estado) {
              const createObj = entityManager.create(TipodocsEmpresaEntity, {
                tipodoc: getTipoDoc,
                empresa: empresa,
              });

              await entityManager.save(TipodocsEmpresaEntity, createObj);
            } else {
              throw new HttpException(
                `El tipo de documento ${nombreDocumento} no existe o está inactivo.`,
                HttpStatus.NOT_ACCEPTABLE,
              );
            }
          }

          const objResult: EmpresaListDTO = {
            id: empresa.id,
            usuario: {
              nombres: empresa.usuario.nombres,
              apellidos: empresa.usuario.apellidos,
              nombre_completo:
                empresa.usuario.nombres + ' ' + empresa.usuario.apellidos,
            },
            ruc: empresa.ruc,
            razon_social: empresa.razon_social,
            modo: empresa.modo === 0 ? 'BETA' : 'PRODUCCION',
            ose: empresa.ose_enabled ? 'SI' : 'NO',
            web_service: empresa.web_service,
            sunat_usu: empresa.usu_secundario_user,
            sunat_pass: empresa.usu_secundario_password,
            ose_usu: empresa.usu_secundario_ose_user,
            ose_pass: empresa.usu_secundario_ose_password,
            logo: empresa.logo,
            direccion: empresa.domicilio_fiscal,
            ubigeo: empresa.ubigeo,
            estado: empresa.estado,
          };

          return objResult;
        },
      );

      //Si todo sale ok creamos establecimiento x defecto
      const establecimiento =
        await this.establecimientoService.createEstablecimiento({
          data: {
            codigo: '0000',
            denominacion: result.razon_social,
            departamento: (body.data as any).departamento.label ?? '',
            provincia: (body.data as any).provincia.label ?? '',
            distrito: (body.data as any).distrito.label ?? '',
            direccion: result.direccion,
            ubigeo: result.ubigeo,
            empresa: result.id,
          },
          files: result.logo,
        });

      //Creamos punto de venta por defecto
      await this.posService.createPOS({
        nombre: `POS Principal - ${establecimiento.denominacion}`,
        codigo: '001',
        establecimiento: establecimiento.id,
      });

      return result;
    } catch (e) {
      throw new HttpException(
        `Error al intentar crear empresa EmpresaService.save. ${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //: Promise<EmpresaListDTO>
  async updateEmpresa(
    id: number,
    body: {
      data: UpdateEmpresaDTO;
      files: any;
    },
  ) {
    const empresa = await this.empresaRepository.findOne({
      relations: {
        establecimientos: {
          empresa: true,
        },
        usuario: true,
        tipodoc_empresa: {
          tipodoc: true,
        },
      },
      where: {
        id,
      },
    });

    if (!empresa)
      throw new HttpException('La empresa no existe.', HttpStatus.BAD_REQUEST);

    //No se actualizara el usuario
    //codigo aqui

    //modo 1 = producción
    if (empresa.modo === 1 && body.data.modo === 0)
      throw new HttpException(
        'La empresa no puede pasar a BETA una vez estado en PRODUCCIÓN.',
        HttpStatus.BAD_REQUEST,
      );

    if (
      body.data.modo === 1 &&
      !body.files?.certificado &&
      empresa.fieldname_cert === 'certificado_beta' &&
      empresa.cert === 'certificado_beta.pfx'
    )
      throw new HttpException(
        'En modo PRODUCCIÓN la empresa debe contener un certificado digital válido.',
        HttpStatus.BAD_REQUEST,
      );

    if (!this.validarRutaCert(empresa.ruc, empresa.cert) && empresa.modo === 1)
      throw new HttpException(
        'No se encuentra el certificado de la empresa en su directorio actual. Por favor consulte con el soporte técnico.',
        HttpStatus.BAD_REQUEST,
      );

    try {
      const result = await this.dataSource.transaction(
        async (entityManager) => {
          const fileName_cert_timestamp = this.crearCert(
            empresa.ruc,
            body.data.modo,
            body.files.certificado,
          );

          //Preparamos merge para actualizar empresa
          this.empresaRepository.merge(empresa, {
            ...body.data,
            logo: body.files?.logo
              ? body.files.logo.originalname
              : empresa.logo,
            web_service:
              body.data.modo === 0 //0 = beta
                ? 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
                : body.data.ose_enabled
                ? body.data.web_service
                : 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
            cert: body.files?.certificado
              ? fileName_cert_timestamp
              : empresa.cert,
            fieldname_cert: body.files?.certificado
              ? body.files.certificado.originalname.substring(
                  0,
                  body.files.certificado.originalname.lastIndexOf('.'), //obtenermos el nombre del certificado
                )
              : empresa.fieldname_cert,
            establecimientos:
              body.data.establecimientos.length > 0
                ? body.data.establecimientos
                : empresa.establecimientos,
          });
          const newEmpresa = await entityManager.save(EmpresaEntity, empresa);

          //Al actualizar los datos de la empresa tambien debe actualizar los datos del establecimiento 0000
          const establecimientoDefault =
            await this.establecimientoRepository.findOne({
              where: {
                empresa: {
                  id: Equal(newEmpresa.id),
                },
                codigo: '0000',
              },
            });

          // Obtener el texto después del último guion
          const lastPart = newEmpresa.domicilio_fiscal.split('-').pop().trim();

          // Dividir la última parte en tres palabras
          const [distrito, provincia, departamento] = lastPart.split(' ');
          await entityManager.update(
            EstablecimientoEntity,
            {
              id: Equal(establecimientoDefault.id),
            },
            {
              ...establecimientoDefault,
              denominacion: newEmpresa.razon_social,
              departamento: departamento,
              provincia: provincia,
              distrito: distrito,
              direccion: newEmpresa.domicilio_fiscal,
              ubigeo: newEmpresa.ubigeo,
              logo: newEmpresa.logo,
            },
          );

          /**
           * Al modificar el logo principal se actualizara el directorio principal,
           * el filename registro del establecimiento 0000 y el directorio de
           * la sucursal 0000.
           */
          if (body.files.logo) {
            await entityManager.update(
              EstablecimientoEntity,
              {
                empresa: {
                  id: Equal(newEmpresa.id),
                },
                codigo: '0000',
              },
              { logo: newEmpresa.logo },
            );
            this.crearLogo(empresa.ruc, body.files.logo);
            this.crearLogo(empresa.ruc, body.files.logo, `0000/IMAGES/LOGO`);
          }

          //Si tiene documentos nuevos el body ingresamos para agregar y crear documentos
          for (let index = 0; index < body.data.documentos.length; index++) {
            const inputDocumento = body.data.documentos[index];

            if (inputDocumento.new) {
              const tipoDocumento =
                await this.tipodocService.findOneTipoDocById(inputDocumento.id);

              const createDocumento = entityManager.create(
                TipodocsEmpresaEntity,
                {
                  tipodoc: tipoDocumento,
                  empresa: newEmpresa,
                },
              );

              const documentoExiste = await this.documentRepository.findOne({
                where: {
                  tipodoc: {
                    id: inputDocumento.id,
                  },
                  empresa: {
                    id: empresa.id,
                  },
                },
              });

              if (documentoExiste) {
                throw new HttpException(
                  `El documento "${inputDocumento.nombre}" ya existe para la empresa.`,
                  HttpStatus.NOT_ACCEPTABLE,
                );
              }

              if (tipoDocumento && tipoDocumento.estado) {
                await entityManager.save(
                  TipodocsEmpresaEntity,
                  createDocumento,
                );
              } else {
                throw new HttpException(
                  `El documento "${inputDocumento.nombre}" no existe o está inactivo.`,
                  HttpStatus.NOT_ACCEPTABLE,
                );
              }
            }
          }

          /**
           *Recorre todos los archivos binarios con el name "establecimientos" donde
            creara los directorios con sus respectivos logos y guardara los ids de los
            establecimientos ya existentes.
           */
          const idsField: number[] = [];
          const fileEstablecimiento = body.files.establecimientos;
          for (
            let index = 0;
            fileEstablecimiento && index < body.files.establecimientos.length;
            index++
          ) {
            const fileEstablecimiento = body.files.establecimientos[index];
            const originalname = fileEstablecimiento.originalname;
            const partes = originalname.split(/[:,]/);
            const attribID = String(partes[4]);
            const codigoFile = String(partes[1]);
            const nameFile = partes[3];
            const objBuffer = {
              ...fileEstablecimiento,
              originalname: nameFile,
            };

            this.crearLogo(empresa.ruc, objBuffer, `${codigoFile}/IMAGES/LOGO`);

            if (attribID === 'id') {
              idsField.push(Number(partes[5]));
            }
          }

          //Si tiene establecimientos el body ingresamos para agregar y crear
          for (
            let index = 0;
            index < body.data.establecimientos.length;
            index++
          ) {
            const establecimiento = body.data.establecimientos[index];

            //Modificamos la data del establecimiento
            if (establecimiento.id) {
              const findEstablecimiento =
                await this.establecimientoService.findEstablecimientoById(
                  establecimiento.id,
                );

              if (findEstablecimiento.codigo !== '0000') {
                await entityManager.update(
                  EstablecimientoEntity,
                  {
                    id: Equal(findEstablecimiento.id),
                  },
                  {
                    codigo: establecimiento.codigo,
                    denominacion: establecimiento.denominacion,
                    departamento: establecimiento.departamento.label,
                    provincia: establecimiento.provincia.label,
                    distrito: establecimiento.distrito.label,
                    direccion: establecimiento.direccion,
                    ubigeo: establecimiento.ubigeo,
                    empresa: newEmpresa,
                    estado: establecimiento.estado,
                    logo:
                      idsField.includes(establecimiento.id) &&
                      fileEstablecimiento
                        ? establecimiento.logo
                        : findEstablecimiento.logo,
                  },
                );
              }
            } else {
              const createObjEst = this.establecimientoRepository.create({
                codigo: establecimiento.codigo,
                denominacion: establecimiento.denominacion,
                departamento: establecimiento.departamento.label,
                provincia: establecimiento.provincia.label,
                distrito: establecimiento.distrito.label,
                direccion: establecimiento.direccion,
                ubigeo: establecimiento.ubigeo,
                empresa: newEmpresa,
                estado: establecimiento.estado,
                logo:
                  fileEstablecimiento && establecimiento.logo
                    ? establecimiento.logo
                    : 'logo_default.png',
              });

              await entityManager.save(EstablecimientoEntity, createObjEst);
            }
          }

          const objResult: EmpresaListDTO = {
            id: newEmpresa.id,
            usuario: {
              nombres: empresa.usuario.nombres,
              apellidos: empresa.usuario.apellidos,
              nombre_completo:
                empresa.usuario.nombres + ' ' + empresa.usuario.apellidos,
            },
            ruc: newEmpresa.ruc,
            razon_social: newEmpresa.razon_social,
            modo: newEmpresa.modo === 0 ? 'BETA' : 'PRODUCCION',
            ose: newEmpresa.ose_enabled ? 'SI' : 'NO',
            web_service: newEmpresa.web_service,
            sunat_usu: newEmpresa.usu_secundario_user,
            sunat_pass: newEmpresa.usu_secundario_password,
            ose_usu: newEmpresa.usu_secundario_ose_user,
            ose_pass: newEmpresa.usu_secundario_ose_password,
            logo: newEmpresa.logo,
            direccion: newEmpresa.domicilio_fiscal,
            ubigeo: newEmpresa.ubigeo,
            estado: newEmpresa.estado,
            documentos: empresa.tipodoc_empresa.map((a) => {
              return {
                id: a.id,
                nombre: a.tipodoc.tipo_documento,
              };
            }),
          };

          return objResult;
        },
      );

      return result;
    } catch (e) {
      throw new HttpException(
        `Error al intentar actualizar empresa EmpresaService.update. ${e.response}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listEmpresas(
    userToken: QueryToken,
    front = true,
  ): Promise<EmpresaListDTO[] | EmpresaEntity[]> {
    const { tokenEntityFull } = userToken;

    let empresas: EmpresaEntity[] = [];

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        empresas = await this.empresaRepository.find({
          relations: {
            usuario: true,
            establecimientos: {
              series: {
                documento: {
                  tipodoc: true,
                },
              },
            },
            tipodoc_empresa: {
              tipodoc: true,
            },
          },
        });
      } catch (e) {
        throw new HttpException(
          'Error al listar empresas.',
          HttpStatus.NOT_FOUND,
        );
      }
    } else {
      try {
        empresas = await this.empresaRepository.find({
          relations: {
            usuario: true,
            establecimientos: {
              series: {
                documento: {
                  tipodoc: true,
                },
              },
            },
            tipodoc_empresa: {
              tipodoc: true,
            },
          },
          where: {
            usuario: {
              _id: String(tokenEntityFull._id),
            },
          },
        });
      } catch (e) {
        throw new HttpException(
          'Error al listar empresas.',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (front) {
      const queryEmpresa: EmpresaListDTO[] = empresas.map((a) => {
        return {
          id: a.id,
          usuario: {
            nombres: a.usuario.nombres,
            apellidos: a.usuario.apellidos,
            nombre_completo: a.usuario.nombres + ' ' + a.usuario.apellidos,
          },
          ruc: a.ruc,
          razon_social: a.razon_social,
          modo: a.modo === 0 ? 'BETA' : 'PRODUCCION',
          ose: a.ose_enabled ? 'SI' : 'NO',
          web_service: a.web_service,
          sunat_usu: a.usu_secundario_user,
          sunat_pass: a.usu_secundario_password,
          ose_usu: a.usu_secundario_ose_user,
          ose_pass: a.usu_secundario_ose_password,
          estado: a.estado,
        };
      });

      //Enviar query para front
      return queryEmpresa;
    }

    //Si el result se usa para otra funcion backend usar query completo
    return empresas;
  }

  async desactivateEmpresa(idEmpresa: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    let estado = false;

    //Validamos existencia de la empresa y el estado actual
    const findEmpresa = (await this.findOneEmpresaById(
      idEmpresa,
      true,
    )) as EmpresaEntity;
    if (!findEmpresa.estado) {
      throw new HttpException(
        'La empresa ya se encuentra desactivada.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Al actualizar el estado de la empresa tambien debe actualizar el estado del establecimiento 0000
    const establecimientos = await this.establecimientoRepository.find({
      where: {
        empresa: {
          id: Equal(findEmpresa.id),
        },
      },
    });

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        await this.empresaRepository.update(idEmpresa, { estado: false });

        // Desactivamos establecimientos
        for (let index = 0; index < establecimientos.length; index++) {
          const establecimiento = establecimientos[index];
          await this.establecimientoRepository.update(establecimiento.id, {
            estado: false,
          });
        }

        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al desactivar empresa EmpresaService.desactivateEmpresa.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //Solo es permitido eliminar por el usuario padre y sus hijos teniendo el permiso correspondiente
      if (tokenEntityFull.empresas) {
        const findEmpresaToken = tokenEntityFull.empresas.find(
          (empresa) => empresa.id === findEmpresa.id,
        );
        if (
          findEmpresaToken ||
          String(findEmpresa.usuario._id) === String(tokenEntityFull._id)
        ) {
          try {
            await this.empresaRepository.update(idEmpresa, { estado: false });

            // Desactivamos establecimientos
            for (let index = 0; index < establecimientos.length; index++) {
              const establecimiento = establecimientos[index];
              await this.establecimientoRepository.update(establecimiento.id, {
                estado: false,
              });
            }

            estado = true;
          } catch (e) {
            throw new HttpException(
              'Error al desactivar empresa EmpresaService.desactivateEmpresa.',
              HttpStatus.BAD_REQUEST,
            );
          }
        } else {
          throw new HttpException(
            'Solo puedes desactivar la empresa a la que perteneces.',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          'No puedes desactivar una empresa ya que no estas asignado a una.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return estado;
  }

  async activateEmpresa(idEmpresa: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    let estado = false;

    //Validamos existencia de la empresa y el estado actual
    const findEmpresa = (await this.findOneEmpresaById(
      idEmpresa,
      true,
    )) as EmpresaEntity;
    if (findEmpresa.estado) {
      throw new HttpException(
        'La empresa ya se encuentra activada.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Al actualizar el estado de la empresa tambien debe actualizar el estado del establecimiento 0000
    const establecimientos = await this.establecimientoRepository.find({
      where: {
        empresa: {
          id: Equal(findEmpresa.id),
        },
      },
    });

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        await this.empresaRepository.update(idEmpresa, { estado: true });

        // Activamos establecimientos
        for (let index = 0; index < establecimientos.length; index++) {
          const establecimiento = establecimientos[index];
          await this.establecimientoRepository.update(establecimiento.id, {
            estado: true,
          });
        }

        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al desactivar empresa EmpresaService.activateEmpresa.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //Solo es permitido eliminar por el usuario padre y sus hijos teniendo el permiso correspondiente
      if (tokenEntityFull.empresas) {
        const findEmpresaToken = tokenEntityFull.empresas.find(
          (empresa) => empresa.id === findEmpresa.id,
        );
        if (
          findEmpresaToken ||
          String(findEmpresa.usuario._id) === String(tokenEntityFull._id)
        ) {
          try {
            await this.empresaRepository.update(idEmpresa, { estado: true });

            // Activamos establecimientos
            for (let index = 0; index < establecimientos.length; index++) {
              const establecimiento = establecimientos[index];
              await this.establecimientoRepository.update(establecimiento.id, {
                estado: true,
              });
            }

            estado = true;
          } catch (e) {
            throw new HttpException(
              'Error al desactivar empresa EmpresaService.activateEmpresa.',
              HttpStatus.BAD_REQUEST,
            );
          }
        } else {
          throw new HttpException(
            'Solo puedes activar la empresa a la que perteneces.',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          'No puedes activar una empresa ya que no estas asignado a una.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return estado;
  }

  async findEstablecimientosByEmpresa(idEmpresa: number) {
    let establecimientos: EstablecimientoEntity[];

    try {
      establecimientos = await this.establecimientoRepository.find({
        where: {
          empresa: {
            id: idEmpresa,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener establecimientos EmpresaService.findEstablecimientosByEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return establecimientos;
  }

  async findOneEmpresaById(
    idEmpresa: number,
    internal = false,
  ): Promise<EmpresaEntity | EmpresaDetailDTO> {
    let empresa: EmpresaEntity;

    try {
      empresa = await this.empresaRepository.findOne({
        relations: {
          usuario: true,
          tipodoc_empresa: {
            tipodoc: true,
          },
          establecimientos: {
            pos: true,
          },
        },
        where: {
          id: idEmpresa,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la empresa EmpresaService.findOneEmpresaById.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!empresa) {
      throw new HttpException(
        'La empresa no se encuentra o no existe.',
        HttpStatus.NOT_FOUND,
      );
    }

    const { estado, tipodoc_empresa, usuario, ...rest } = empresa;

    const URL_BASE_STATIC = this.configService.get<string>('URL_BASE_STATIC');
    const empresaDetail: EmpresaDetailDTO = {
      id: empresa.id,
      logo: [
        {
          name: empresa.logo,
          src:
            empresa.logo === 'logo_default.png'
              ? `${URL_BASE_STATIC}/default/${empresa.logo}`
              : `${URL_BASE_STATIC}/${empresa.ruc}/IMAGES/LOGO/${empresa.logo}`,
        },
      ],
      ruc: empresa.ruc,
      razon_social: empresa.razon_social,
      nombre_comercial: empresa.nombre_comercial,
      domicilio_fiscal: empresa.domicilio_fiscal,
      ubigeo: empresa.ubigeo,
      urbanizacion: empresa.urbanizacion,
      correo: empresa.correo,
      telefono_movil_1: empresa.telefono_movil_1,
      telefono_movil_2: empresa.telefono_movil_2,
      telefono_fijo_1: empresa.telefono_fijo_1,
      telefono_fijo_2: empresa.telefono_fijo_2,
      web_service: empresa.web_service,
      fieldname_cert: empresa.fieldname_cert,
      cert: [
        {
          name: empresa.cert,
        },
      ],
      cert_password: empresa.cert_password,
      modo: empresa.modo,
      ose_enabled: empresa.ose_enabled,
      usu_secundario_user: empresa.usu_secundario_user,
      usu_secundario_password: empresa.usu_secundario_password,
      usu_secundario_ose_user: empresa.usu_secundario_ose_user,
      usu_secundario_ose_password: empresa.usu_secundario_ose_password,
      establecimientos: empresa.establecimientos
        .map((a) => {
          const departamento = DEPARTAMENTOS.find(
            (b) => b.departamento.toUpperCase() === a.departamento,
          );

          const provincia = PROVINCIAS.find(
            (c) => c.provincia.toUpperCase() === a.provincia,
          );
          const distrito = DISTRITOS.find(
            (d) => d.distrito.toUpperCase() === a.distrito,
          );

          return {
            id: a.id,
            codigo: a.codigo,
            denominacion: a.denominacion,
            departamento: {
              value: departamento?.id || '-',
              label: departamento?.departamento.toUpperCase() || '-',
            },
            provincia: {
              value: provincia?.id || '-',
              label: provincia?.provincia.toUpperCase() || '-',
            },
            distrito: {
              value: distrito?.id || '-',
              label: distrito?.distrito.toUpperCase() || '-',
            },
            direccion: a.direccion,
            logo: [
              {
                name: a.logo,
              },
            ],
            ubigeo: a.ubigeo,
            estado: a.estado,
            pos: a.pos,
          };
        })
        .filter((a) => a.codigo !== '0000'),
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombre_completo: usuario.nombres + ' ' + usuario.apellidos,
      },
      estado: estado,
      documentos: tipodoc_empresa.map((a) => {
        return {
          id: a.id,
          nombre: a.tipodoc.tipo_documento,
          estado: a.estado,
        };
      }),
    };

    const result = internal ? empresa : empresaDetail;

    return result;
  }

  async findOneEmpresaByUserId(idUser: number) {
    try {
      return await this.empresaRepository.findOne({
        relations: {
          establecimientos: true,
          tipodoc_empresa: {
            tipodoc: true,
          },
        },
        where: {
          usuario: {
            id: idUser,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la empresa por usuario EmpresaService.findOneEmpresaById.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAllEmpresasByUserIdObject(idUser: string) {
    try {
      const empresas = await this.empresaRepository.find({
        relations: {
          configsEmpresa: true,
          establecimientos: {
            configsEstablecimiento: true,
          },
        },
        select: {
          id: true,
          razon_social: true,
          ruc: true,
          estado: true,
          establecimientos: {
            id: true,
            codigo: true,
            denominacion: true,
            estado: true,
          },
        },
        where: {
          usuario: {
            _id: String(idUser),
          },
        },
      });
      return empresas.map((emp) => {
        return {
          ...emp,
          establecimientos: emp.establecimientos.map((est) => {
            return {
              ...est,
              codigo: est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
            };
          }),
        };
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la empresa por usuario EmpresaService.findOneEmpresaById.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAllEmpresasByUserId(idUser: number) {
    try {
      return await this.empresaRepository.find({
        relations: {
          configsEmpresa: true,
          establecimientos: {
            configsEstablecimiento: true,
          },
        },
        where: {
          usuario: {
            id: idUser,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la empresa por usuario EmpresaService.findOneEmpresaById.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findDocumentsByIdEmpresa(idEmpresa: number) {
    let documentos: EmpresaEntity;

    try {
      documentos = await this.empresaRepository.findOne({
        relations: {
          establecimientos: {
            configsEstablecimiento: true,
            series: {
              documento: {
                tipodoc: true,
              },
            },
          },
          tipodoc_empresa: {
            tipodoc: true,
          },
        },
        where: {
          id: idEmpresa,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener documentos EmpresaService.findDocumentsByIdEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return documentos;
  }

  crearLogo(ruc: string, logo: any, establecimiento?: string) {
    //Creamos carpeta Logo
    let pathDirLog = '';

    if (establecimiento) {
      pathDirLog = `public/${ruc}/IMAGES/LOGO/establecimientos/${establecimiento}`;
    } else {
      pathDirLog = `public/${ruc}/IMAGES/LOGO`;
    }

    const existDirLogo = fs.existsSync(pathDirLog);

    if (existDirLogo && logo) {
      //Eliminamos los archivos que existan, solo debe tener un logo cada ruc
      const files = fs.readdirSync(pathDirLog);
      const archivos = files
        .map((file) => path.join(pathDirLog, file))
        .filter((file) => fs.statSync(file).isFile());

      if (archivos.length > 0) {
        archivos.map((file) => {
          fs.unlinkSync(file);
        });
      }
      this.guardarArchivo(pathDirLog, logo.originalname, logo.buffer, true);
    } else {
      if (logo) {
        this.guardarArchivo(pathDirLog, logo.originalname, logo.buffer, true);
      }
    }
    //Fin crear logo
  }

  crearCert(ruc: string, modo: number, certificado: any) {
    //Crear carpeta certificado
    let fileName_cert_timestamp = '';
    if (modo === 1 && certificado) {
      const currentDate = new Date(); // Obtiene la fecha y hora actual en la zona horaria del servidor
      const formattedDate = currentDate.getTime();
      fileName_cert_timestamp = `${formattedDate}_${certificado.originalname}`;

      this.guardarArchivo(
        `uploads/certificado_digital/produccion/${ruc}`,
        fileName_cert_timestamp,
        certificado.buffer,
        true,
      );
    }
    //Fin crear certificado
    return fileName_cert_timestamp;
  }

  validarRutaCert(ruc: string, certActual: string) {
    const pathDirLog = `uploads/certificado_digital/produccion/${ruc}`;
    const existDirLogo = fs.existsSync(pathDirLog);

    if (existDirLogo) {
      let existe = false;
      const files = fs.readdirSync(pathDirLog);
      console.log(files);
      files.map((file) => {
        if (file === certActual) {
          existe = true;
        }
      });

      return existe;
    }
  }

  guardarArchivo(
    ruta: string,
    nombreArchivo: string,
    dataArchivo: string | Buffer,
    buffer?: boolean,
  ) {
    const pathDir = path.join(process.cwd(), ruta);
    const existDir = fs.existsSync(pathDir);

    if (!existDir) {
      //Creamos directorio
      fs.mkdirSync(pathDir, { recursive: true });
    }

    //Agregamos el archivo al directorio
    fs.writeFileSync(
      `${pathDir}/${nombreArchivo}`,
      buffer ? dataArchivo : fs.readFileSync(dataArchivo),
    );

    return `${pathDir}/${nombreArchivo}`;
  }
}
