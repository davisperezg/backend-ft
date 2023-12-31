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

//base: http://localhost:3000/api/v1/groups-resources
@Controller('api/v1/groups-resources')
export class GroupsResourceController {
  constructor(private readonly groupService: GroupsResourceService) {}

  // Get Groups: http://localhost:3000/api/v1/groups-resources
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadPermisos))
  async getGroups(@Res() res) {
    const groups = await this.groupService.findAll();
    return res.status(HttpStatus.OK).json(groups);
  }

  // Add Menu(POST): http://localhost:3000/api/v1/groups-resources
  // @Post()
  // @UseGuards(PermissionGuard(Permission.CreateGroups))
  // async createGroup(@Res() res, @Body() createGroup: any) {
  //   const response = await this.groupService.create(createGroup);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Grupo creado éxitosamente',
  //     response,
  //   });
  // }

  // Update Menu(PUT): http://localhost:3000/api/v1/groups-resources/605ab8372ed8db2ad4839d87
  // @Put(':id')
  // @UseGuards(PermissionGuard(Permission.UpdateGroups))
  // async updateGroup(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @Body() createGroup: any,
  // ) {
  //   const response = await this.groupService.update(id, createGroup);
  //   return res.status(HttpStatus.OK).json({
  //     message: 'Grupo actualizado éxitosamente',
  //     response,
  //   });
  // }

  // Delete Group(DELETE): http://localhost:3000/api/v1/groups-resources/605ab8372ed8db2ad4839d87
  // @Delete(':id')
  // @UseGuards(PermissionGuard(Permission.DeleteGroups))
  // async deleteGroup(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @CtxUser() user: any,
  // ): Promise<boolean> {
  //   const deleted = await this.groupService.delete(id, user);
  //   return res.status(HttpStatus.OK).json(deleted);
  // }

  // Restore Module(PUT): http://localhost:3000/api/v1/groups-resources/restore/605ab8372ed8db2ad4839d87
  // @Put('restore/:id')
  // @UseGuards(PermissionGuard(Permission.RestoreGroups))
  // async restoreGroup(
  //   @Res() res,
  //   @Param('id') id: string,
  //   @CtxUser() user: any,
  // ) {
  //   const restore = await this.groupService.restore(id, user);
  //   return res.status(HttpStatus.OK).json(restore);
  // }
}
