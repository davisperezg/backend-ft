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
    const findUser: any = await this.authService.validateUser(payload.userId);
    const findResource = await this.rrService.findOneResourceByRol(
      findUser.role._id,
    );
    const user = {
      findUser,
      findResource,
    };
    //const resources = test.resource.includes(permission);

    if (!findUser) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
