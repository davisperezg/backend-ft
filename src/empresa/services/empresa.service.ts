import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaEntity } from '../entities/empresa.entity';
import * as fs from 'fs';
import path from 'path';
import { QueryToken } from 'src/auth/dto/queryToken';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { UserService } from 'src/user/services/user.service';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(EmpresaEntity)
    private empresaRepository: Repository<EmpresaEntity>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async createEmpresa(body: any) {
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
      body.data.user,
    );

    if (!userMYSQL) {
      throw new HttpException(
        'No se encontró usuario o no existe EmpresaService.findOne.',
        HttpStatus.NOT_FOUND,
      );
    }

    const createEmpresa = this.empresaRepository.create({
      logo: body.files?.logo
        ? body.files.logo.originalname
        : 'logo_default.png', //file logo empresa
      ruc: body.data.ruc,
      razon_social: body.data.razon_social,
      nombre_comercial: body.data.nombre_comercial,
      usuario: userMYSQL,
      modo: body.data.modo,
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

    //console.log(createEmpresa);

    try {
      return await this.empresaRepository.save(createEmpresa);
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear empresa EmpresaService.save.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listEmpresas(userToken: QueryToken) {
    const { tokenEntityFull } = userToken;
    console.log('EMPRESA - Id de user', tokenEntityFull._id);

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        return await this.empresaRepository.find();
      } catch (e) {
        throw new HttpException(
          'Error al listar empresas.',
          HttpStatus.NOT_FOUND,
        );
      }
    } else {
      try {
        return await this.empresaRepository.find({
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

  async findOneEmpresaById(idEmpresa: number) {
    let empresa: EmpresaEntity;

    try {
      empresa = await this.empresaRepository.findOne({
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

    return empresa;
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
