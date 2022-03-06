import {
  Controller,
  HttpStatus,
  Post,
  Res,
  Body,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { Resource_Role } from '../schemas/resources-role';
import { ResourcesRolesService } from '../services/resources-roles.service';

@Controller('api/v1/resources-roles')
export class ResourcesRolesController {
  constructor(private readonly rrService: ResourcesRolesService) {}

  // Get Menus
  @Get()
  async getResources(@Res() res): Promise<Resource_Role[]> {
    const resources = await this.rrService.findAll();
    return res.status(HttpStatus.OK).json(resources);
  }

  // Get Menus
  @Get('/role/:id')
  async getResourcesByRol(
    @Res() res,
    @Param('id') id: string,
  ): Promise<Resource_Role[]> {
    const resources = await this.rrService.findOneResourceByRol(id);
    return res.status(HttpStatus.OK).json(resources);
  }

  // Add Resource
  @Post()
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
  @Put(':id')
  async updateRR(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Resource_Role,
  ): Promise<Resource_Role> {
    const resourceUpdated = await this.rrService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Updated Successfully',
      resourceUpdated,
    });
  }
}
