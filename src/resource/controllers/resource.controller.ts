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
import { Delete, Patch } from '@nestjs/common/decorators';
import { CreateResourceDTO } from '../dto/create-resource';
import { UpdateResourceDTO } from '../dto/update-resource';

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
  async createResource(@Res() res, @Body() createBody: CreateResourceDTO) {
    const response = await this.resourceService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Recurso creado éxitosamente.',
      response,
    });
  }

  // Update Resource: /resources/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdatePermisos))
  async updateResource(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: UpdateResourceDTO,
  ): Promise<Resource> {
    const response = await this.resourceService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Recurso actualizado éxitosamente.',
      response,
    });
  }

  // Delete Resource(DELETE): http://localhost:3000/api/v1/resource/6223169df6066a084cef08c2
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DesactivatePermisos))
  async deleteResource(@Res() res, @Param('id') id: string): Promise<boolean> {
    const userDeleted = await this.resourceService.delete(id);
    return res.status(HttpStatus.OK).json(userDeleted);
  }

  // Restore Resource: http://localhost:3000/api/v1/resource/6223169df6066a084cef08c2
  @Patch(':id')
  @UseGuards(PermissionGuard(Permission.ActivatePermisos))
  async restoreResource(@Res() res, @Param('id') id: string): Promise<boolean> {
    const userRestored = await this.resourceService.restore(id);
    return res.status(HttpStatus.OK).json(userRestored);
  }
}
