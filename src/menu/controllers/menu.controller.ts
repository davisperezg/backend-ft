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
} from '@nestjs/common';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { MenuService } from '../services/menu.service';

@Controller('api/v1/menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Get Menus
  @Get()
  async getMenus(@Res() res): Promise<Menu[]> {
    const menus = await this.menuService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Add Menu
  @Post()
  async createMenu(
    @Res() res,
    @Body() createMenu: MenuDocument,
  ): Promise<Menu> {
    const menu = await this.menuService.create(createMenu);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Successfully Created',
      menu,
    });
  }

  // Update Menu: /menus/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateMenu(
    @Res() res,
    @Param('id') id: string,
    @Body() createMenu: MenuDocument,
  ): Promise<Menu> {
    const menuUpdated = await this.menuService.update(id, createMenu);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Updated Successfully',
      menuUpdated,
    });
  }

  // Delete Menu: /menus/605ab8372ed8db2ad4839d87
  @Delete(':id')
  async deleteMenu(@Res() res, @Param('id') id: string): Promise<boolean> {
    const menuDeleted = await this.menuService.delete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Deleted Successfully',
      menuDeleted,
    });
  }

  // Restore Module: /modules/restore/605ab8372ed8db2ad4839d87
  @Put('restore/:id')
  async restoreModule(@Res() res, @Param('id') id: string): Promise<Menu> {
    const menuRestored = await this.menuService.restore(id);
    return res.status(HttpStatus.OK).json({
      message: 'Menu Restored Successfully',
      menuRestored,
    });
  }
}
