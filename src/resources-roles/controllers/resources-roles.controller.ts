import { QueryToken } from 'src/auth/dto/queryToken';
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
import { Resource_Role } from '../schemas/resources-role';
import { ResourcesRolesService } from '../services/resources-roles.service';

@Controller('api/v1/resources-roles')
export class ResourcesRolesController {
  constructor(private readonly rrService: ResourcesRolesService) {}

  // Get Menus
  // @Get()
  // @UseGuards(PermissionGuard(Permission.ReadResourceR))
  // async getResources(@Res() res): Promise<Resource_Role[]> {
  //   const resources = await this.rrService.findAll();
  //   return res.status(HttpStatus.OK).json(resources);
  // }

  // Get Menus
  @Get('/role/:id')
  @UseGuards(PermissionGuard(Permission.ReadResourcesByRol))
  async getResourcesByRol(
    @Res() res,
    @Param('id') id: string,
  ): Promise<Resource_Role[]> {
    const resources = await this.rrService.findOneResourceByRol(id);
    return res.status(HttpStatus.OK).json(resources);
  }

  // Add Resource
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateResourceR))
  async createRR(
    @Res() res,
    @Body() createBody: Resource_Role,
  ): Promise<Resource_Role> {
    const resource = await this.rrService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Successfully Created',
      resource,
    });
  }

  // Update Resource: /Resources/605ab8372ed8db2ad4839d87
  // @Put(':id')
  // @UseGuards(PermissionGuard(Permission.EditResourceR))
  // async updateRR(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @Body() createBody: Resource_Role,
  // ): Promise<Resource_Role> {
  //   const resourceUpdated = await this.rrService.update(id, createBody);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Resource Updated Successfully',
  //     resourceUpdated,
  //   });
  // }
}
