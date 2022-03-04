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
} from '@nestjs/common';
import { Resource } from '../schemas/resource.schema';
import { ResourceService } from '../services/resource.service';

@Controller('api/v1/resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Delete('/:id')
  async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.resourceService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Deleted Successfully',
      roleDeleted,
    });
  }

  // Get Menus
  @Get()
  async getResources(@Res() res): Promise<Resource[]> {
    const menus = await this.resourceService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Add Resource
  @Post()
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

  // Update Resource: /Resources/605ab8372ed8db2ad4839d87
  @Put(':id')
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
