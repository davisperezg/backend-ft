import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('api/v1/auth/login')
export class AuthController {
  constructor(private authService: AuthService) {}

  //Lgin
  @Post()
  async login(
    @Res() res,
    @Body() data: { username: string; password: string },
  ) {
    const { username, password } = data;
    const user = await this.authService.signIn(username, password);
    return res.status(HttpStatus.OK).json({
      message: 'User Logged',
      user,
    });
  }

  @Post('/token')
  async token(@Body() data: { username: string; refreshToken: string }) {
    return await this.authService.getTokenWithRefresh(data);
  }
}
