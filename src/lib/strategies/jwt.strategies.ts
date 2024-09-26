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

    const user: QueryToken = {
      token_of_permisos: findResource,
      tokenEntityFull: {
        ...userDocument,
        role: {
          ...(userDocument.role as any)._doc,
        } as RoleDocument,
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
        empresas: findUser.empresas
          ? findUser.empresas.map((item) => {
              return {
                id: item.id,
                ruc: item.ruc,
                razon_social: item.razon_social,
                modo: item.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
                nombre_comercial: item.nombre_comercial,
                logo: item.logo,
                estado: item.estado,
                configuraciones: item.configsEmpresa,
                establecimientos: item.establecimientos.map((est) => {
                  return {
                    ...est,
                    codigo: est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
                  };
                }),
              };
            })
          : null,
        empresaActual: findUser.empresas
          ? findUser.empresas
              .filter((empresa) => empresa.estado)
              .map((empresa) => {
                return {
                  id: empresa.id,
                  ruc: empresa.ruc,
                  razon_social: empresa.razon_social,
                  modo: empresa.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
                  nombre_comercial: empresa.nombre_comercial,
                  logo: empresa.logo,
                  estado: empresa.estado,
                  configuraciones: empresa.configsEmpresa,
                  establecimiento: empresa.establecimientos
                    .filter((establecimiento) => establecimiento.estado)
                    .map((est) => {
                      return {
                        ...est,
                        codigo:
                          est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
                      };
                    })[0],
                };
              })[0]
          : null,
      },
    };

    //console.log(user.token_of_front);

    if (!findUser) {
      throw new UnauthorizedException('Acceso denegado!!!');
    }

    return user;
  }
}
