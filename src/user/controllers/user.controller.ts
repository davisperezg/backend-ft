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

  // Get User: http://localhost:3000/api/v1/users/find/6223169df6066a084cef08c2
  @Get('/find/:nro')
  @UseGuards(PermissionGuard(Permission.GetOneUsers))
  getUser(@Param('nro') nro: string) {
    return this.userService.findUserByCodApi(nro);
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
    const user = await this.userService.create(createBody, userToken);
    return res.status(HttpStatus.OK).json(user);
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
    return res.status(HttpStatus.OK).json({
      message: 'User Deleted Successfully',
      userDeleted,
    });
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateUsers))
  async updateUser(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: User,
    @CtxUser() user: QueryToken,
  ): Promise<User> {
    const userUpdated = await this.userService.update(id, createBody, user);
    return res.status(HttpStatus.OK).json({
      message: 'User Updated Successfully',
      userUpdated,
    });
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/change-password/6223169df6066a084cef08c2
  @Put('/change-password/:id')
  @UseGuards(PermissionGuard(Permission.ChangePasswordUsers))
  async changeUser(
    @Res() res,
    @Param('id') id: string,
    @Body()
    data: {
      password: string;
    },
    @CtxUser() userToken: QueryToken,
  ): Promise<User> {
    const passwordUpdated = await this.userService.changePassword(
      id,
      data,
      userToken,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Password Updated Successfully',
      passwordUpdated,
    });
  }

  // Restore User: http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Patch(':id')
  @UseGuards(PermissionGuard(Permission.RestoreUsers))
  async restoreUser(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: QueryToken,
  ): Promise<User> {
    const userRestored = await this.userService.restore(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'User Restored Successfully',
      userRestored,
    });
  }
}
