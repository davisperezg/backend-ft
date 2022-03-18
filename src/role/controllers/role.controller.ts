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

//base: http://localhost:3000/api/v1/roles
@Controller('api/v1/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Get Roles: http://localhost:3000/api/v1/roles
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadRole))
  getRoles(@CtxUser() user: any) {
    return this.roleService.findAll(user);
  }

  // Get Role: http://localhost:3000/api/v1/roles/find/6223169df6066a084cef08c2
  @Get('/find/:id')
  @UseGuards(JwtAuthGuard)
  getRole(@Param('id') id: string, @CtxUser() user: any) {
    return this.roleService.findRoleById(id, user);
  }

  // Get Roles removes: http://localhost:3000/api/v1/roles/removes
  @Get('/removes')
  getRolesRemoves() {
    return this.roleService.findAllDeleted();
  }

  // Get Data role by name(POST): http://localhost:3000/api/v1/roles/data
  @Post('/data')
  getDataByName(@Body() createBody: Role) {
    const { name } = createBody;
    return this.roleService.findRoleByName(name);
  }

  // Add Role(POST): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateRole))
  async createRole(@Res() res, @Body() createBody: Role): Promise<Role> {
    const user = await this.roleService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Role Successfully Created',
      user,
    });
  }

  // Delete Role(DELETE): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteRole))
  async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.roleService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Role Deleted Successfully',
      roleDeleted,
    });
  }

  // Update Role(PUT): http://localhost:3000/api/v1/roles/6223169df6066a084cef08c2
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.EditRole))
  async updateRole(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Role,
    @CtxUser() user: any,
  ): Promise<Role> {
    const roleUpdated = await this.roleService.update(id, createBody, user);
    return res.status(HttpStatus.OK).json({
      message: 'Role Updated Successfully',
      roleUpdated,
    });
  }

  // Restore Role(PUT): http://localhost:3000/api/v1/roles/restore/6223169df6066a084cef08c2
  @Put('restore/:id')
  @UseGuards(PermissionGuard(Permission.RestoreRole))
  async restoreRole(@Res() res, @Param('id') id: string): Promise<Role> {
    const roleRestored = await this.roleService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'Role Restored Successfully',
      roleRestored,
    });
  }
}
