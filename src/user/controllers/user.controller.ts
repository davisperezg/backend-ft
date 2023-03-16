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
import {
  Ctx,
  EventPattern,
  Payload,
  KafkaContext,
} from '@nestjs/microservices';

//base: http://localhost:3000/api/v1/users
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Get Users: http://localhost:3000/api/v1/users
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadUsers))
  getUsers(@CtxUser() user: any) {
    return this.userService.findAll(user);
  }

  // Get User: http://localhost:3000/api/v1/users/find/6223169df6066a084cef08c2
  @Get('/find/:nro')
  @UseGuards(PermissionGuard(Permission.GetOneUser))
  getUser(@Param('nro') nro: string) {
    return this.userService.findUserByCodApi(nro);
  }

  // Get Me: http://localhost:3000/api/v1/users/whois
  @Get('/whois')
  @UseGuards(JwtAuthGuard)
  whois(@Res() res, @CtxUser() user: any): Promise<UserDocument> {
    const { findUser } = user;
    return res.status(HttpStatus.OK).json({ user: findUser });
  }

  // Add User(POST): http://localhost:3000/api/v1/users
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateUser))
  async createUser(
    @Res() res,
    @Body() createBody: User,
    @CtxUser() userToken: any,
  ): Promise<User> {
    const user = await this.userService.create(createBody, userToken);
    return res.status(HttpStatus.OK).json({
      message: 'User Successfully Created',
      user,
    });
  }

  // Delete User(DELETE): http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteUser))
  async deleteUser(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: any,
  ): Promise<boolean> {
    const userDeleted = await this.userService.delete(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'User Deleted Successfully',
      userDeleted,
    });
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/6223169df6066a084cef08c2
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateUser))
  async updateUser(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: User,
    @CtxUser() user: any,
  ): Promise<User> {
    const userUpdated = await this.userService.update(id, createBody, user);
    return res.status(HttpStatus.OK).json({
      message: 'User Updated Successfully',
      userUpdated,
    });
  }

  // Update User(PUT): http://localhost:3000/api/v1/users/change-password/6223169df6066a084cef08c2
  @Put('/change-password/:id')
  @UseGuards(PermissionGuard(Permission.ChangePasswordUser))
  async changeUser(
    @Res() res,
    @Param('id') id: string,
    @Body()
    data: {
      password: string;
    },
    @CtxUser() userToken: any,
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

  // Restore User: http://localhost:3000/api/v1/users/restore/6223169df6066a084cef08c2
  @Put('restore/:id')
  @UseGuards(PermissionGuard(Permission.RestoreUser))
  async restoreUser(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: any,
  ): Promise<User> {
    const userRestored = await this.userService.restore(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'User Restored Successfully',
      userRestored,
    });
  }
}
