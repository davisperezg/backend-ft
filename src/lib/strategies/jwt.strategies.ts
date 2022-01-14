import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from 'src/auth/services/auth.service';
import { jwtConstants } from '../const/consts';

interface JWType {
  userId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JWType) {
    const findUser = await this.authService.validateUser(payload.userId);
    if (!findUser) {
      throw new UnauthorizedException();
    }

    return findUser;
  }
}
