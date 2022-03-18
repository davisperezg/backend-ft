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
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { Resource } from '../schemas/resource.schema';
import { ResourceService } from '../services/resource.service';

@Controller('api/v1/resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  // @Delete('/:id')
  // async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
  //   const roleDeleted = await this.resourceService.delete(id);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Deleted Successfully',
  //     roleDeleted,
  //   });
  // }

  // Get Menus
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadResource))
  async getResources(@Res() res): Promise<Resource[]> {
    const menus = await this.resourceService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Add Resource
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateResource))
  async createResource(
    @Res() res,
    @Body() createBody: Resource,
  ): Promise<Resource> {
    const resource = await this.resourceService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Successfully Created',
      resource,
    });
  }

  // Update Resource: /resources/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.EditResource))
  async updateResource(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Resource,
  ): Promise<Resource> {
    const resourceUpdated = await this.resourceService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Updated Successfully',
      resourceUpdated,
    });
  }
}
