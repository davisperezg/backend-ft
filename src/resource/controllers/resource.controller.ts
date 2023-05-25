import { QueryToken } from './../../auth/dto/queryToken';
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
import { Resource } from '../schemas/resource.schema';
import { ResourceService } from '../services/resource.service';

@Controller('api/v1/resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  // Get Resources
  @Get('/to-dual')
  @UseGuards(
    PermissionGuard([
      Permission.ReadPermisosAvailables,
      Permission.ReadPermisos2Availables,
    ]),
  )
  async getResources(
    @Res() res,
    @CtxUser() user: QueryToken,
  ): Promise<Resource[]> {
    const menus = await this.resourceService.findAll(user);
    return res.status(HttpStatus.OK).json(menus);
  }

  // Get Resources to CRUD
  @Get('/list')
  @UseGuards(PermissionGuard(Permission.ReadPermisos))
  async getResourcesToCRUD(@Res() res): Promise<Resource[]> {
    const menus = await this.resourceService.findAllToCRUD();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Get One Resource To Edit
  // @Get('/find/:id')
  // //@UseGuards(PermissionGuard(Permission.GetOneResource))
  // getPermission(@Param('id') id: string) {
  //   return this.resourceService.findOne(id);
  // }

  // Add Resource
  @Post()
  @UseGuards(PermissionGuard(Permission.CreatePermisos))
  async createResource(
    @Res() res,
    @Body() createBody: Resource,
  ): Promise<Resource> {
    const created = await this.resourceService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Successfully Created',
      created,
    });
  }

  // Update Resource: /resources/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdatePermisos))
  async updateResource(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Resource,
  ): Promise<Resource> {
    const updated = await this.resourceService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Updated Successfully',
      updated,
    });
  }
}
