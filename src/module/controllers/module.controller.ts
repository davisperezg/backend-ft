import { CreateModuleDTO } from './../dto/create-module';
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
import { UpdateModuleDTO } from '../dto/update-module';
import { Patch } from '@nestjs/common/decorators';

//base: http://localhost:3000/api/v1/modules
@Controller('api/v1/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  // Get Modules: http://localhost:3000/api/v1/modules
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadModules))
  getModules(@CtxUser() user: QueryToken) {
    return this.moduleService.listModules(user);
  }
  //this.moduleService.findAll(user);

  // Get Modules: http://localhost:3000/api/v1/modules/to-users
  @Get('/to-dual')
  @UseGuards(
    PermissionGuard([
      Permission.ReadModulosAvailables,
      Permission.ReadModulos2Availables,
    ]),
  )
  getModulesListToUser(@CtxUser() user: QueryToken) {
    return this.moduleService.findAvailables(user);
  }

  // Get Module: http://localhost:3000/api/v1/modules/find/6223169df6066a084cef08c2
  @Get('/find/:id')
  @UseGuards(PermissionGuard(Permission.GetOneModules))
  getModule(@Param('id') id: string) {
    return this.moduleService.findActiveModuleById(id);
  }

  // Add Module(POST): http://localhost:3000/api/v1/modules
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateModules))
  async createMenu(
    @Res() res,
    @Body() createModule: CreateModuleDTO,
    @CtxUser() user: QueryToken,
  ) {
    const response = await this.moduleService.create(createModule, user);
    return res.status(HttpStatus.OK).json({
      message: 'El módulo ha sido creado éxitosamente.',
      response,
    });
  }

  // Update Module(PUT): http://localhost:3000/api/v1/modules/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateModules))
  async updateModule(
    @Res() res,
    @Param('id') id: string,
    @Body() createMenu: UpdateModuleDTO,
    @CtxUser() user: QueryToken,
  ) {
    const response = await this.moduleService.update(id, createMenu, user);
    return res.status(HttpStatus.OK).json({
      message: 'El módulo ha sido actualizado éxitosamente.',
      response,
    });
  }

  // Delete Module(DELETE): http://localhost:3000/api/v1/modules/605ab8372ed8db2ad4839d87
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteModules))
  async deleteModule(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: QueryToken,
  ): Promise<boolean> {
    const moduleDeleted = await this.moduleService.delete(id, user);
    return res.status(HttpStatus.OK).json(moduleDeleted);
  }

  // Restore Module(PUT): http://localhost:3000/api/v1/modules/restore/605ab8372ed8db2ad4839d87
  @Patch(':id')
  @UseGuards(PermissionGuard(Permission.RestoreModule))
  async restoreModule(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: QueryToken,
  ): Promise<Module> {
    const moduleRestored = await this.moduleService.restore(id, user);
    return res.status(HttpStatus.OK).json(moduleRestored);
  }
}
