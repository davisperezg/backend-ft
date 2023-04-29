import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/services/user.service';
import { uid, suid } from 'rand-token';
import { comparePassword } from 'src/lib/helpers/auth.helper';
import { UserDocument } from 'src/user/schemas/user.schema';
import { APIS_TOKEN } from 'src/lib/const/consts';
import axios from 'axios';

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
        'Usuario y/o contraseña inválida',
        HttpStatus.BAD_REQUEST,
      );

    //verify password with password hashed in db
    const isMatch = await comparePassword(password, findUser.password);

    //if does not exist
    if (!isMatch)
      throw new HttpException(
        'Usuario y/o contraseña inválida',
        HttpStatus.BAD_REQUEST,
      );

    if (findUser.status !== true) {
      throw new HttpException(
        'Usuario sin acceso al sistema',
        HttpStatus.UNAUTHORIZED,
      );
    }

    //email in refresh token
    refreshTokens[refresh_token] = username;

    //return {access_token and refresh_token}
    return { access_token: this.getToken(findUser._id), refresh_token };
  }

  //method to validate token with refresh-token v0.0.1
  async getTokenWithRefresh(body: { email: string; refreshToken: string }) {
    const email = body.email;
    const refreshToken = body.refreshToken;

    const findUser = await this.userService.findUserByUsername(email);

    //verify if exist refresh token and email in refresh token, is correct  ?f
    if (
      refreshToken in refreshTokens &&
      refreshTokens[refreshToken] === email
    ) {
      return { access_token: this.getToken(findUser._id) };
    } else {
      throw new HttpException(
        'Ocurrio un error, recargue la pagina',
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
  async validateUser(id: string) {
    //find user by Id
    return await this.userService.findUserById(id);
  }

  async findPersona(tipDocumento: string, nroDocumento: string) {
    const TIP = tipDocumento.toLowerCase();
    const NRO = nroDocumento.toLowerCase();

    try {
      const result = await axios.get(
        `https://api.apis.net.pe/v2/${TIP}?numero=${NRO}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${APIS_TOKEN}`,
          },
        },
      );

      return result.data;
    } catch (e) {
      const dta = e.response.data;
      if (dta) {
        const { error } = dta;

        if (dta === 'Not Found')
          throw new HttpException(
            `Documento no encontrado`,
            HttpStatus.NOT_FOUND,
          );

        throw new HttpException(`${error}`, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        'Ha ocurrido un error al intentar buscar a la persona. Comuniquese con el administrador del sistema e intente ingresar la data de la persona manualmente',
        HttpStatus.FOUND,
      );
    }
  }
}
