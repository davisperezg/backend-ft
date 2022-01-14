import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  Put,
} from '@nestjs/common';
import { ModuleOptions } from '../schemas/module-options.schema';
import { ModuleOptionsService } from '../services/module-options.service';

@Controller('api/v1/module-options')
export class ModuleOptionsController {
  constructor(private readonly moService: ModuleOptionsService) {}

  // Add resource
  @Post()
  async createModuleOptions(
    @Res() res,
    @Body() createBody: ModuleOptions,
  ): Promise<ModuleOptions> {
    const resource = await this.moService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Successfully Created',
      resource,
    });
  }

  @Delete('/delete/:id')
  async deleteMO(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.moService.delete_complete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Deleted Successfully',
      roleDeleted,
    });
  }

  // Get resources
  @Get()
  async getMO(@Res() res): Promise<ModuleOptions[]> {
    const menus = await this.moService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Get resources
  @Get('/resource/role/:idRol')
  async getOptionsByRoleAndModule(
    @Param('idRol') idRol: string,
    //@Param('idModule') idModule: string,
  ): Promise<ModuleOptions[]> {
    return await this.moService.findOptionsByRolAndModule(idRol);
  }

  // Update Option: /resource/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateResource(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: ModuleOptions,
  ): Promise<ModuleOptions> {
    const resourceUpdated = await this.moService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Resource Updated Successfully',
      resourceUpdated,
    });
  }
}
