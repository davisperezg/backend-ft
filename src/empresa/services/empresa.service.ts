import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmpresaEntity } from '../entities/empresa.entity';
import * as fs from 'fs';
import path from 'path';
import { QueryToken } from 'src/auth/dto/queryToken';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { UserService } from 'src/user/services/user.service';
import { EmpresaSimpleDTO } from '../dto/queryEmpresas.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { CreateEmpresaDTO } from '../dto/create-empresa.dto';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';

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
    private dataSource: DataSource,
    private establecimientoService: EstablecimientoService,
  ) {}

  async createEmpresa(body: {
    data: CreateEmpresaDTO;
    files: any;
  }): Promise<EmpresaSimpleDTO> {
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

    const pathDirLog = `public/${body.data.ruc}/IMAGES/LOGO`;

    const existDirLogo = fs.existsSync(pathDirLog);
    //Si existe directorio de logo segun el ruc accedemos
    if (existDirLogo) {
      //Eliminamos los archivos que existan, solo debe tener un logo cada ruc
      const findLogos = fs.readdirSync(pathDirLog);
      if (findLogos.length > 0) {
        findLogos.map((a) => {
          fs.unlinkSync(`${pathDirLog}/${a}`);
        });
      }
    }

    //Una vez eliminado un logo existente o si no existe directorio, crearemos un logo siempre y cuando exista un file logo
    if (body.files?.logo) {
      this.guardarArchivo(
        pathDirLog,
        body.files.logo.originalname,
        body.files.logo.buffer,
        true,
      );
    }

    let fileName_cert_timestamp = '';
    //Creamos certificado si existe
    if (body.files?.certificado) {
      const currentDate = new Date(); // Obtiene la fecha y hora actual en la zona horaria del servidor
      const formattedDate = currentDate.getTime();
      fileName_cert_timestamp = `${formattedDate}_${body.files.certificado.originalname}`;

      this.guardarArchivo(
        `uploads/certificado_digital/produccion/${body.data.ruc}`,
        fileName_cert_timestamp,
        body.files.certificado.buffer,
        true,
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
      cert_password: body.data.modo === 0 ? '123456' : body.data.cert_password,
      usu_secundario_user:
        body.data.modo === 0
          ? '20000000001MODDATOS'
          : body.data.usu_secundario_user,
      usu_secundario_password:
        body.data.modo === 0 ? 'moddatos' : body.data.usu_secundario_password,
      ose_enabled: body.data.ose_enabled,
      usu_secundario_ose_user: body.data.ose_enabled
        ? body.data.usu_secundario_ose_user
        : '',
      usu_secundario_ose_password: body.data.ose_enabled
        ? body.data.usu_secundario_ose_password
        : '',
    });

    try {
      const result = await this.dataSource.transaction(
        async (entityManager) => {
          //Creamos empresa
          const empresa = await entityManager.save(
            EmpresaEntity,
            createEmpresa,
          );

          //Si tiene documentos el body ingresamos para agregar y crear documentos
          for (let index = 0; index < body.data.documentos.length; index++) {
            const tipo = body.data.documentos[index].id;
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
            }
          }

          const objResult: EmpresaSimpleDTO = {
            id_empresa: empresa.id,
            usuario: {
              nombres: empresa.usuario.nombres,
              apellidos: empresa.usuario.apellidos,
              nombre_completo:
                empresa.usuario.nombres + ' ' + empresa.usuario.apellidos,
            },
            ruc: empresa.ruc,
            razon_social: empresa.razon_social,
            modo: empresa.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
            ose: empresa.ose_enabled ? 'SI' : 'NO',
            web_service: empresa.web_service,
            sunat_usu: empresa.usu_secundario_user,
            sunat_pass: empresa.usu_secundario_password,
            ose_usu: empresa.usu_secundario_ose_user,
            ose_pass: empresa.usu_secundario_ose_password,
            status: empresa.estado,
          };

          return objResult;
        },
      );

      //Si todo sale ok creamos establecimiento x defecto
      await this.establecimientoService.createEstablecimiento({
        data: {
          codigo: '0000',
          denominacion: createEmpresa.nombre_comercial,
          departamento: '',
          provincia: '',
          distrito: '',
          direccion: createEmpresa.domicilio_fiscal,
          ubigeo: createEmpresa.ubigeo,
          empresa: createEmpresa.id,
        },
        files: createEmpresa.logo,
      });

      return result;
    } catch (e) {
      console.log(e);
      throw new HttpException(
        'Error al intentar crear empresa EmpresaService.save.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listEmpresas(
    userToken: QueryToken,
    front = true,
  ): Promise<EmpresaSimpleDTO[] | EmpresaEntity[]> {
    const { tokenEntityFull } = userToken;
    console.log('EMPRESA - Id de user', tokenEntityFull._id);
    let empresas: EmpresaEntity[] = [];

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        empresas = await this.empresaRepository.find({
          relations: {
            usuario: true,
            tipodoc_empresa: {
              series: true,
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
            tipodoc_empresa: {
              series: true,
              tipodoc: true,
            },
          },
          where: {
            usuario: {
              _id: tokenEntityFull._id,
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
      const queryEmpresa: EmpresaSimpleDTO[] = empresas.map((a) => {
        return {
          id_empresa: a.id,
          usuario: {
            nombres: a.usuario.nombres,
            apellidos: a.usuario.apellidos,
            nombre_completo: a.usuario.nombres + ' ' + a.usuario.apellidos,
          },
          ruc: a.ruc,
          razon_social: a.razon_social,
          modo: a.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
          ose: a.ose_enabled ? 'SI' : 'NO',
          web_service: a.web_service,
          sunat_usu: a.usu_secundario_user,
          sunat_pass: a.usu_secundario_password,
          ose_usu: a.usu_secundario_ose_user,
          ose_pass: a.usu_secundario_ose_password,
          status: a.estado,
        };
      });

      //Enviar query para front
      return queryEmpresa;
    }

    //Si el result se usa para otra funcion backend usar query completo
    return empresas;
  }

  async desactivateEmpresa(idEmpresa: number) {
    let estado = false;

    try {
      await this.empresaRepository.update(idEmpresa, { estado: false });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al desactivar empresa EmpresaService.desactivateEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async activateEmpresa(idEmpresa: number) {
    let estado = false;

    try {
      await this.empresaRepository.update(idEmpresa, { estado: true });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al desactivar empresa EmpresaService.activateEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async findOneEmpresaByIdx(idEmpresa: number, internal = false) {
    let empresa: EmpresaEntity;

    try {
      empresa = await this.empresaRepository.findOne({
        relations: {
          usuario: true,
          tipodoc_empresa: {
            tipodoc: true,
            series: true,
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

    const result = internal
      ? empresa
      : {
          ...rest,
          usuario: {
            id: usuario.id,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            nombres_completo: usuario.nombres + ' ' + usuario.apellidos,
          },
          logo: [
            {
              name: empresa.logo,
            },
          ],
          cert: [
            {
              name: empresa.cert,
            },
          ],
          status: estado,
          documentos: tipodoc_empresa.map((a) => {
            return {
              id: a.id,
              nombre: a.tipodoc.tipo_documento,
            };
          }),
        };

    return result;
  }

  async findOneEmpresaByUserId(idUser: number) {
    try {
      return await this.empresaRepository.findOne({
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
    return await this.empresaRepository.findOne({
      relations: {
        tipodoc_empresa: {
          series: true,
          tipodoc: true,
        },
      },
      where: {
        id: idEmpresa,
      },
    });
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
