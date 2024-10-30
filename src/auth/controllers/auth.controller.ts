import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Get } from '@nestjs/common/decorators';
import { Param } from '@nestjs/common/decorators/http/route-params.decorator';
import { AuthService } from '../services/auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  //Lgin
  @Post('/login')
  async login(@Res() res, @Body() data: { email: string; password: string }) {
    const { email, password } = data;
    const user = await this.authService.signIn(email, password);
    return res.status(HttpStatus.OK).json({
      message: 'User Logged',
      user,
    });
  }

  @Post('/token')
  async token(@Body() data: { username: string; refreshToken: string }) {
    return await this.authService.getTokenWithRefresh(data);
  }

  @Get('/ext/:tipDocumento/:nroDocumento')
  async API_findPersona(
    @Res() res,
    @Param('tipDocumento') tipDocumento: string,
    @Param('nroDocumento') nroDocumento: string,
  ) {
    const apiExt = await this.authService.findPersona(
      tipDocumento,
      nroDocumento,
    );
    return res.status(HttpStatus.OK).json(apiExt);
  }

  @Get('/ext/sunat/ruc/:nroRuc')
  async API_SUNAT_findRuc(@Res() res, @Param('nroRuc') nroRuc: string) {
    const apiExt = await this.authService.findRuc(nroRuc);
    return res.status(HttpStatus.OK).json(apiExt);
  }

  @Get('/ext/sunat/dni/:nroDni')
  async API_SUNAT_findDni(@Res() res, @Param('nroDni') nroDni: string) {
    const apiExt = await this.authService.findDni(nroDni);
    return res.status(HttpStatus.OK).json(apiExt);
  }
}
