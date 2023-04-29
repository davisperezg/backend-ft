import {
  Controller,
  HttpStatus,
  Post,
  Res,
  Body,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { Resource_User } from '../schemas/resources-user';
import { ResourcesUsersService } from '../services/resources-users.service';

@Controller('api/v1/resources-users')
export class ResourcesUsersController {
  constructor(private readonly rrService: ResourcesUsersService) {}

  // Get Menus
  // @Get()
  // @UseGuards(PermissionGuard(Permission.ReadResourceR))
  // async getResources(@Res() res): Promise<Resource_User[]> {
  //   const resources = await this.rrService.findAll();
  //   return res.status(HttpStatus.OK).json(resources);
  // }

  // Get Menus
  @Get('/user/:id')
  //@UseGuards(PermissionGuard(Permission.ReadResourcesByUser))
  async getResourcesByUser(
    @Res() res,
    @Param('id') id: string,
  ): Promise<Resource_User[]> {
    const resources = await this.rrService.findOneResourceByUser(id);
    return res.status(HttpStatus.OK).json(resources);
  }

  // Add Resource
  @Post()
  //@UseGuards(PermissionGuard(Permission.CreateResourceU))
  async createRR(
    @Res() res,
    @Body() createBody: Resource_User,
    @CtxUser() user: any,
  ): Promise<Resource_User> {
    const resource = await this.rrService.create(createBody, user);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Successfully Created',
      resource,
    });
  }

  // Update Resource
  // @Put(':id')
  // @UseGuards(PermissionGuard(Permission.EditResourceR))
  // async updateRR(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @Body() createBody: Resource_User,
  // ): Promise<Resource_User> {
  //   const resourceUpdated = await this.rrService.update(id, createBody);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Resource Updated Successfully',
  //     resourceUpdated,
  //   });
  // }
}
