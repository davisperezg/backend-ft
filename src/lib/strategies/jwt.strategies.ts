import { UserDocument } from 'src/user/schemas/user.schema';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
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
      tokenEntityFull: userDocument,
      token_of_front: {
        id: String(userDocument._id),
        usuario: userDocument.name + ' ' + userDocument.lastname,
        estado_usuario: userDocument.status,
        rol: {
          nombre: userDocument.role.name,
          modulos: userDocument.role.module.map((a) => {
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
          }),
        },
        estado_rol: userDocument.role.status,
      },
    };

    if (!findUser) {
      throw new UnauthorizedException('Acceso denegado!!!');
    }

    return user;
  }
}
