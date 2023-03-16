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
  UseGuards,
} from '@nestjs/common';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { Module } from '../schemas/module.schema';
import { ModuleService } from '../services/module.service';

//base: http://localhost:3000/api/v1/modules
@Controller('api/v1/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  // Get Modules: http://localhost:3000/api/v1/modules
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadModuleItem))
  getModules(@CtxUser() user: QueryToken) {
    return this.moduleService.findAll(user);
  }

  // Get Modules: http://localhost:3000/api/v1/modules/list
  @Get('/list')
  @UseGuards(PermissionGuard(Permission.ReadModuleList))
  getModulesList(@CtxUser() user: QueryToken) {
    return this.moduleService.listModules(user);
  }

  // Get Module: http://localhost:3000/api/v1/modules/find/6223169df6066a084cef08c2
  @Get('/find/:id')
  @UseGuards(PermissionGuard(Permission.GetOneModule))
  getModule(@Param('id') id: string) {
    return this.moduleService.findOne(id);
  }

  // Add Module(POST): http://localhost:3000/api/v1/modules
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateModule))
  async createMenu(
    @Res() res,
    @Body() createModule: Module,
    @CtxUser() user: QueryToken,
  ): Promise<Module> {
    const module = await this.moduleService.create(createModule, user);
    return res.status(HttpStatus.OK).json({
      message: 'Module Successfully Created',
      module,
    });
  }

  // Delete Module(DELETE): http://localhost:3000/api/v1/modules/605ab8372ed8db2ad4839d87
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteModule))
  async deleteModule(@Res() res, @Param('id') id: string): Promise<boolean> {
    const moduleDeleted = await this.moduleService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Module Deleted Successfully',
      moduleDeleted,
    });
  }

  // Update Module(PUT): http://localhost:3000/api/v1/modules/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.EditModule))
  async updateModule(
    @Res() res,
    @Param('id') id: string,
    @Body() createMenu: Module,
    @CtxUser() user: QueryToken,
  ): Promise<Module> {
    const moduleUpdated = await this.moduleService.update(id, createMenu, user);
    return res.status(HttpStatus.OK).json({
      message: 'Module Updated Successfully',
      moduleUpdated,
    });
  }

  // Restore Module(PUT): http://localhost:3000/api/v1/modules/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  @UseGuards(PermissionGuard(Permission.RestoreModule))
  async restoreModule(@Res() res, @Param('id') id: string): Promise<Module> {
    const moduleRestored = await this.moduleService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'Module Restored Successfully',
      moduleRestored,
    });
  }
}
