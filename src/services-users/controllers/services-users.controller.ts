import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { Services_User } from '../schemas/services-user';
import { ServicesUsersService } from '../services/services-users.service';

@Controller('api/v1/services-users')
export class ServicesUsersController {
  constructor(private readonly suService: ServicesUsersService) {}

  //Get Modules By User
  @Get('/user/:id')
  //@UseGuards(PermissionGuard(Permission.ReadServicesBUser))
  async getModulesByUser(
    @Res() res,
    @Param('id') id: string,
  ): Promise<Services_User[]> {
    const modules = await this.suService.findModulesByUser(id);
    return res.status(HttpStatus.OK).json(modules);
  }

  //Add Service
  @Post()
  //@UseGuards(PermissionGuard(Permission.CreateServiceUser))
  async createRR(
    @Res() res,
    @Body() createBody: Services_User,
  ): Promise<Services_User> {
    const service = await this.suService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Service Successfully Created',
      service,
    });
  }

  //Update Service:
  // @Put(':id')
  // @UseGuards(PermissionGuard(Permission.EditResourceR))
  // async updateRR(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @Body() createBody: Services_User,
  // ): Promise<Services_User> {
  //   const serviceUpdated = await this.suService.update(id, createBody);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Service Updated Successfully',
  //     serviceUpdated,
  //   });
  // }
}
