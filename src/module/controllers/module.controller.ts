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
import { Module } from '../schemas/module.schema';
import { ModuleService } from '../services/module.service';

@Controller('api/v1/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  // Get Module
  @Get()
  getModules() {
    return this.moduleService.findAll();
  }

  // Get Roles removes
  @Get('/removes')
  getModulesRemoves() {
    return this.moduleService.findAllDeleted();
  }

  // Add Module
  @Post()
  async createMenu(@Res() res, @Body() createModule: Module): Promise<Module> {
    const module = await this.moduleService.create(createModule);
    return res.status(HttpStatus.OK).json({
      message: 'Module Successfully Created',
      module,
    });
  }

  // Delete Module: /modules/605ab8372ed8db2ad4839d87
  @Delete(':id')
  async deleteModule(@Res() res, @Param('id') id: string): Promise<boolean> {
    const moduleDeleted = await this.moduleService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Module Deleted Successfully',
      moduleDeleted,
    });
  }

  // Update Module: /modules/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateModule(
    @Res() res,
    @Param('id') id: string,
    @Body() createMenu: Module,
  ): Promise<Module> {
    const moduleUpdated = await this.moduleService.update(id, createMenu);
    return res.status(HttpStatus.OK).json({
      message: 'Module Updated Successfully',
      moduleUpdated,
    });
  }

  // Restore Module: /modules/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  async restoreModule(@Res() res, @Param('id') id: string): Promise<Module> {
    const moduleRestored = await this.moduleService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'Module Restored Successfully',
      moduleRestored,
    });
  }
}
