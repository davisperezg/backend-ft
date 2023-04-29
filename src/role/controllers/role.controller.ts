import { Patch } from '@nestjs/common/decorators';
import { QueryToken } from './../../auth/dto/queryToken';
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
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { JwtAuthGuard } from 'src/lib/guards/auth.guard';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { Role } from '../schemas/role.schema';
import { RoleService } from '../services/role.service';
import { CreateRolDTO } from '../dto/create-rol.dto';
import { UpdateModuleDTO } from '../dto/update-rol.dto';

//base: http://localhost:3000/api/v1/roles
@Controller('api/v1/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Get Roles: http://localhost:3000/api/v1/roles
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadRoles))
  getRoles(@CtxUser() user: QueryToken) {
    return this.roleService.findAll(user);
  }

  // Get Roles to User: http://localhost:3000/api/v1/list/roles
  @Get('/to-users')
  @UseGuards(PermissionGuard(Permission.ReadRolesAvailables))
  getUsersRolesDisponibles(@CtxUser() user: QueryToken) {
    return this.roleService.listRolesUsers(user);
  }

  // Get Role: http://localhost:3000/api/v1/roles/find/6223169df6066a084cef08c2
  @Get('/find/:id')
  @UseGuards(PermissionGuard(Permission.GetOneRoles))
  getRole(@Param('id') id: string) {
    return this.roleService.findRoleById(id);
  }

  // Add Role(POST): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateRoles))
  async createRole(
    @Res() res,
    @Body() createBody: CreateRolDTO,
    @CtxUser() user: QueryToken,
  ) {
    const role = await this.roleService.create(createBody, user);
    return res.status(HttpStatus.OK).json(role);
  }

  // Delete Role(DELETE): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteRoles))
  async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.roleService.delete(id);
    return res.status(HttpStatus.OK).json(roleDeleted);
  }

  // Update Role(PUT): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateRoles))
  async updateRole(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: UpdateModuleDTO,
    @CtxUser() user: QueryToken,
  ) {
    const roleUpdated = await this.roleService.update(id, createBody, user);
    return res.status(HttpStatus.OK).json(roleUpdated);
  }

  // Restore Role(PUT): http://localhost:3000/api/v1/roles/restore/6223169df6066a084cef08c2
  @Patch(':id')
  @UseGuards(PermissionGuard(Permission.RestoreRoles))
  async restoreRole(@Res() res, @Param('id') id: string) {
    const roleRestored = await this.roleService.restore(id);
    return res.status(HttpStatus.OK).json(roleRestored);
  }
}
