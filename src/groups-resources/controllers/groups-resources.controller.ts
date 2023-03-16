import {
  Controller,
  Get,
  Post,
  Res,
  Body,
  HttpStatus,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { GroupsResourceService } from '../services/groups-resources.services';

//base: http://localhost:3000/api/v1/menus
@Controller('api/v1/groups-resources')
export class GroupsResourceController {
  constructor(private readonly groupService: GroupsResourceService) {}

  // Get Menus: http://localhost:3000/api/v1/menus
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadMenu))
  async getMenus(@Res() res) {
    const menus = await this.groupService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Add Menu(POST): http://localhost:3000/api/v1/menus
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateMenu))
  async createMenu(@Res() res, @Body() createMenu: any) {
    const menu = await this.groupService.create(createMenu);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Successfully Created',
      menu,
    });
  }

  // Update Menu(PUT): http://localhost:3000/api/v1/menus/605ab8372ed8db2ad4839d87
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.EditMenu))
  async updateMenu(
    @Res() res,
    @Param('id') id: string,
    @Body() createMenu: any,
  ) {
    const menuUpdated = await this.groupService.update(id, createMenu);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Updated Successfully',
      menuUpdated,
    });
  }

  // Delete Menu(DELETE): http://localhost:3000/api/v1/menus/605ab8372ed8db2ad4839d87
  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.DeleteMenu))
  async deleteMenu(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: any,
  ): Promise<boolean> {
    const menuDeleted = await this.groupService.delete(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Deleted Successfully',
      menuDeleted,
    });
  }

  // Restore Module(PUT): http://localhost:3000/api/v1/menus/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  @UseGuards(PermissionGuard(Permission.RestoreMenu))
  async restoreModule(
    @Res() res,
    @Param('id') id: string,
    @CtxUser() user: any,
  ) {
    const menuRestored = await this.groupService.restore(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Restored Successfully',
      menuRestored,
    });
  }
}
