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

@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Get Users
  @Get()
  getUsers() {
    return this.userService.findAll();
  }

  // Get Roles removes
  @Get('/removes')
  getUsersRemoves() {
    return this.userService.findAllDeleted();
  }

  // Get Me
  @UseGuards(JwtAuthGuard)
  @Get('/whois')
  whois(@Res() res, @CtxUser() user: UserDocument): Promise<UserDocument> {
    return res.status(HttpStatus.OK).json(user);
  }

  // Add User
  @Post()
  async createUser(@Res() res, @Body() createBody: User): Promise<User> {
    const user = await this.userService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'User Successfully Created',
      user,
    });
  }

  // Delete User: /modules/605ab8372ed8db2ad4839d87
  @Delete(':id')
  async deleteUser(@Res() res, @Param('id') id: string): Promise<boolean> {
    const userDeleted = await this.userService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'User Deleted Successfully',
      userDeleted,
    });
  }

  // Update User: /users/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateUser(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: User,
  ): Promise<User> {
    const userUpdated = await this.userService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'User Updated Successfully',
      userUpdated,
    });
  }

  // Restore User: /users/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  async restoreUser(@Res() res, @Param('id') id: string): Promise<User> {
    const userRestored = await this.userService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'User Restored Successfully',
      userRestored,
    });
  }
}
