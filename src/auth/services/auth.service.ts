import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/services/user.service';
import { uid, suid } from 'rand-token';
import { comparePassword } from 'src/lib/helpers/auth.helper';
import { UserDocument } from 'src/user/schemas/user.schema';

const refreshTokens = {};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  //login user
  async signIn(username: string, password: string) {
    const refresh_token = uid(256);

    //find user by username
    const findUser = await this.userService.findUserByUsername(username);

    //if does not exist
    if (!findUser)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Username or Password invalid',
        },
        HttpStatus.UNAUTHORIZED,
      );

    //verify password with password hashed in db
    const isMatch = await comparePassword(password, findUser.password);

    //if does not exist
    if (!isMatch)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Username or Password invalid',
        },
        HttpStatus.UNAUTHORIZED,
      );

    if (findUser.status !== true) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'User does not have access',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    //email in refresh token
    refreshTokens[refresh_token] = username;

    //return {access_token and refresh_token}
    return { access_token: this.getToken(findUser._id), refresh_token };
  }

  //method to validate token with refresh-token v0.0.1
  async getTokenWithRefresh(body: { username: string; refreshToken: string }) {
    const username = body.username;
    const refreshToken = body.refreshToken;

    const findUser = await this.userService.findUserByUsername(username);

    //verify if exist refresh token and email in refresh token, is correct  ?f
    if (
      refreshToken in refreshTokens &&
      refreshTokens[refreshToken] === username
    ) {
      return { access_token: this.getToken(findUser._id) };
    } else {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Ocurrio un error, recargue la pagina.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  //method to get token in login
  getToken(id: string): string {
    const payload = { userId: id };
    return this.jwt.sign(payload);
  }

  //validate user searching by id to jwt.strategies.ts
  async validateUser(id: string): Promise<UserDocument> {
    //find user by Id
    return await this.userService.findUserById(id);
  }
}
