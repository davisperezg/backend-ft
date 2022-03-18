import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from 'src/auth/services/auth.service';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import { jwtConstants } from '../const/consts';

interface JWType {
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly rrService: ResourcesRolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JWType) {
    const myUser: any = await this.authService.validateUser(payload.userId);

    //busca los modulos y menus activos
    const modulesTrues = myUser.role.module
      .filter((mod) => mod.status === true)
      .map((mod) => {
        return {
          ...mod._doc,
          menu: mod.menu.filter((filt) => filt.status === true),
        };
      });

    const validaModules = [];
    if (myUser.role.name !== 'OWNER') {
      myUser._doc.creator.role.module.filter((mod) => {
        modulesTrues.filter((mods) => {
          if (mod.name === mods.name) {
            validaModules.push(mods);
          }
        });
      });
    }

    const findUser = [myUser._doc].map((format) => {
      return {
        ...format,
        role: {
          ...format.role._doc,
          module:
            myUser.role.name === 'OWNER' ||
            myUser.role.name === 'SUPER ADMINISTRADOR'
              ? modulesTrues
              : validaModules,
        },
      };
    })[0];

    const findResource = await this.rrService.findOneResourceByRol(
      findUser.role._id,
    );

    const user = {
      findUser,
      findResource,
    };

    if (!findUser) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
