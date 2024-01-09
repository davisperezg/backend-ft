import { UserDocument } from 'src/user/schemas/user.schema';
import { MOD_PRINCIPAL, ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from 'src/auth/services/auth.service';
import { ResourcesUsersService } from 'src/resources-users/services/resources-users.service';
import { ConfigService } from '@nestjs/config';
import { QueryToken } from 'src/auth/dto/queryToken';
import { RoleDocument } from 'src/role/schemas/role.schema';

interface JWType {
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly ruService: ResourcesUsersService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY'),
    });
  }

  async validate(payload: JWType) {
    const myUser = await this.authService.validateUser(payload.userId);

    //busca los modulos y menus activos
    const modulesTrues = myUser.role.module
      .filter((mod) => mod.status === true)
      .map((mod) => {
        return {
          ...mod,
          menu: mod.menu.filter((filt) => filt.status === true),
        };
      });

    const validaModules = [];
    if (myUser.role.name !== ROL_PRINCIPAL) {
      myUser.creator.role.module.filter((mod) => {
        modulesTrues.filter((mods) => {
          if (mod.name === mods.name) {
            validaModules.push(mods);
          }
        });
      });
    }

    const { _doc: findUser } = [myUser].map((format) => {
      return {
        ...format,
        role: {
          ...format.role,
          module:
            myUser.role.name === ROL_PRINCIPAL ? modulesTrues : validaModules,
        },
      };
    })[0] as any;

    const userDocument: UserDocument = findUser;

    //si el usuario tiene estado false se cierra el acceso al sistema
    if (userDocument.status === false) {
      throw new HttpException('Acceso denegado!!', HttpStatus.UNAUTHORIZED);
    }

    const findResource = await this.ruService.findOneResourceByUser(
      userDocument._id,
    );

    //console.log(findUser.empresa);

    const user: QueryToken = {
      token_of_permisos: findResource,
      tokenEntityFull: {
        ...userDocument,
        role: {
          ...(userDocument.role as any)._doc,
        } as RoleDocument,
        empresas: findUser.empresa
          ? findUser.empresa.map((item) => {
              return {
                id: item.id,
                ruc: item.ruc,
                razon_social: item.razon_social,
                nombre_comercial: item.nombre_comercial,
                logo: item.logo,
                web_service: item.web_service,
                fieldname_cert: item.fieldname_cert,
                cert: item.cert,
                cert_password: item.cert_password,
                modo: item.modo,
                usu_secundario_user: item.usu_secundario_user,
                usu_secundario_password: item.usu_secundario_password,
                ose_enabled: item.ose_enabled,
                usu_secundario_ose_user: item.usu_secundario_ose_user,
                usu_secundario_ose_password: item.usu_secundario_ose_password,
                domicilio_fiscal: item.domicilio_fiscal,
                ubigeo: item.ubigeo,
                urbanizacion: item.urbanizacion,
                correo: item.correo,
                telefono_movil_1: item.telefono_movil_1,
              };
            })
          : null,
      },
      token_of_front: {
        id: String(userDocument._id),
        nombre_usuario: userDocument.name + ' ' + userDocument.lastname,
        usuario: userDocument.username,
        email_usuario: userDocument.email,
        estado_usuario: userDocument.status,
        rol: {
          nombre: userDocument.role.name,
          modulos: userDocument.role.module
            .map((a) => {
              return {
                nombre: a.name,
                estado: a.status,
                menus: a.menu.map((b) => {
                  return {
                    nombre: b.name,
                    estado: b.status,
                  };
                }),
              };
            })
            .sort((a, b) =>
              a.nombre === MOD_PRINCIPAL
                ? -1
                : b.nombre === MOD_PRINCIPAL
                ? 1
                : 0,
            ),
        },
        estado_rol: userDocument.role.status,
        empresas: findUser.empresa
          ? findUser.empresa.map((item) => {
              return {
                id: item.id,
                ruc: item.ruc,
                razon_social: item.razon_social,
                modo: item.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
                nombre_comercial: item.nombre_comercial,
                logo: item.logo,
                estado: item.estado,
                establecimientos: item.establecimientos.map((est) => {
                  return {
                    ...est,
                    codigo: est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
                  };
                }),
              };
            })
          : null,
      },
    };

    if (!findUser) {
      throw new UnauthorizedException('Acceso denegado!!!');
    }

    return user;
  }
}
