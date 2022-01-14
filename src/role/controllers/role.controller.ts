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
import { JwtAuthGuard } from 'src/lib/guards/auth.guard';
import { Role } from '../schemas/role.schema';
import { RoleService } from '../services/role.service';

//@UseGuards(JwtAuthGuard)
@Controller('api/v1/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Get Roles
  @Get()
  getRoles() {
    return this.roleService.findAll();
  }

  // Get Roles removes
  @Get('/removes')
  getRolesRemoves() {
    return this.roleService.findAllDeleted();
  }

  // Get Data role by name
  @Post('/data')
  getDataByName(@Body() createBody: Role) {
    const { name } = createBody;
    return this.roleService.findRoleByName(name);
  }

  // Add Role
  @Post()
  async createRole(@Res() res, @Body() createBody: Role): Promise<Role> {
    const user = await this.roleService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Role Successfully Created',
      user,
    });
  }

  // Delete Role: /modules/605ab8372ed8db2ad4839d87
  @Delete(':id')
  async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.roleService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Role Deleted Successfully',
      roleDeleted,
    });
  }

  // Update Role: /roles/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateRole(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Role,
  ): Promise<Role> {
    const roleUpdated = await this.roleService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Role Updated Successfully',
      roleUpdated,
    });
  }

  // Restore Role: /roles/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  async restoreRole(@Res() res, @Param('id') id: string): Promise<Role> {
    const roleRestored = await this.roleService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'Role Restored Successfully',
      roleRestored,
    });
  }
}
