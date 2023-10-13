import { Patch } from '@nestjs/common/decorators';
import { QueryToken } from './../../auth/dto/queryToken';
import { UserService } from '../services/user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';

import { User, UserDocument } from '../schemas/user.schema';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { JwtAuthGuard } from 'src/lib/guards/auth.guard';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UpdatePasswordDTO } from '../dto/update-password.dto';

//base: http://localhost:3000/api/v1/users
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Get Users: http://localhost:3000/api/v1/users
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadUsers))
  getUsers(@CtxUser() user: QueryToken) {
    return this.userService.findAll(user);
  }

  @Get('/empresa')
  //Modificar permiso
  @UseGuards(PermissionGuard(Permission.ReadUsers))
  getUsersToEmpresa() {
    return this.userService.findUsersToEmpresa();
  }

  // Get Me: http://localhost:3000/api/v1/users/whois
  @Get('/whois')
  @UseGuards(JwtAuthGuard)
  whois(@Res() res, @CtxUser() user: QueryToken): Promise<UserDocument> {
    const { token_of_front } = user;
    return res.status(HttpStatus.OK).json(token_of_front);
  }

  // Add User(POST): http://localhost:3000/api/v1/users
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateUsers))
  async createUser(
    @Res() res,
    @Body() createBody: CreateUserDTO,
    @CtxUser() userToken: QueryToken,
  ) {
    const response = await this.userService.create(createBody, userToken);
    return res.status(HttpStatus.OK).json({
      message: 'El usuario ha sido creado éxitosamente.',
      response,
    });
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateUsers))
  async updateUser(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: UpdateUserDTO,
    @CtxUser() user: QueryToken,
  ): Promise<User> {
    const response = await this.userService.update(id, createBody, user);
    return res.status(HttpStatus.OK).json({
      message: 'El usuario ha sido actualizado éxitosamente.',
      response,
    });
  }

  // Delete User(DELETE): http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteUsers))
  async deleteUser(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: QueryToken,
  ): Promise<boolean> {
    const userDeleted = await this.userService.delete(id, user);
    return res.status(HttpStatus.OK).json(userDeleted);
  }

  // Restore User: http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Patch(':id')
  @UseGuards(PermissionGuard(Permission.RestoreUsers))
  async restoreUser(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: QueryToken,
  ): Promise<boolean> {
    const userRestored = await this.userService.restore(id, user);
    return res.status(HttpStatus.OK).json(userRestored);
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/change-password/6223169df6066a084cef08c2
  @Patch('/change-password/:id')
  @UseGuards(PermissionGuard(Permission.ChangePasswordUsers))
  async changeUser(
    @Res() res,
    @Param('id') id: string,
    @Body()
    data: UpdatePasswordDTO,
    @CtxUser() userToken: QueryToken,
  ) {
    if (data.password === '' || data.password === undefined) {
      return res.status(HttpStatus.OK).json();
    }

    const response = await this.userService.changePassword(
      id,
      data.password,
      userToken,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Contraseña actualizada con éxito',
      response,
    });
  }
}
