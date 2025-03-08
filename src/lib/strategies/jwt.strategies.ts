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
    const user = await this.authService.validateUser(payload.userId);

    if (!user) {
      throw new UnauthorizedException('Acceso denegado!!!');
    }

    //si el usuario tiene estado false se cierra el acceso al sistema
    if (!user.status) {
      throw new HttpException('Acceso denegado!!', HttpStatus.UNAUTHORIZED);
    }

    const resources = await this.ruService.findOneResourceByUser(user._id);

    const result: QueryToken = {
      token_of_permisos: resources,
      tokenEntityFull: {
        ...user._doc,
        role: {
          ...(user.role as any)._doc,
        } as RoleDocument,
      },
      token_of_front: {
        id: String(user._id),
        nombre_usuario: user.name + ' ' + user.lastname,
        usuario: user.username,
        email_usuario: user.email,
        estado_usuario: user.status,
        rol: {
          nombre: user.role.name,
          modulos: user.role.module
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
        estado_rol: user.role.status,
        empresas: user._doc.empresas
          ? user._doc.empresas.map((item) => {
              return {
                id: item.id,
                ruc: item.ruc,
                razon_social: item.razon_social,
                domicilio_fiscal: item.domicilio_fiscal,
                modo: item.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
                nombre_comercial: item.nombre_comercial,
                logo: item.logo,
                estado: item.estado,
                configuraciones: item.configsEmpresa,
                establecimientos: item.establecimientos.map((est) => {
                  const { empresa, ...rest } = est;
                  return {
                    ...rest,
                    codigo: est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
                  };
                }),
              };
            })
          : null,
        empresaActual: user._doc.empresas
          ? user._doc.empresas
              .filter((empresa) => empresa.estado)
              .map((empresa) => {
                return {
                  id: empresa.id,
                  ruc: empresa.ruc,
                  razon_social: empresa.razon_social,
                  domicilio_fiscal: empresa.domicilio_fiscal,
                  modo: empresa.modo === 0 ? 'DESARROLLO' : 'PRODUCCION',
                  nombre_comercial: empresa.nombre_comercial,
                  logo: empresa.logo,
                  estado: empresa.estado,
                  configuraciones: empresa.configsEmpresa,
                  establecimiento: empresa.establecimientos
                    .filter((establecimiento) => establecimiento.estado)
                    .map((est) => {
                      const { empresa, ...rest } = est;
                      return {
                        ...rest,
                        codigo:
                          est.codigo === '0000' ? 'PRINCIPAL' : est.codigo,
                        pos:
                          est.pos
                            .filter((item) => item.estado)
                            .map((item) => {
                              return {
                                ...item,
                              };
                            })[0] || null,
                      };
                    })[0],
                };
              })[0]
          : null,
      },
    };

    return result;
  }
}
