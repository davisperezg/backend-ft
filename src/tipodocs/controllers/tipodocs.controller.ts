import {
  Controller,
  Get,
  UseGuards,
  Res,
  Patch,
  Param,
  HttpStatus,
  Post,
  Body,
  Put,
} from '@nestjs/common';
import { TipodocsService } from '../services/tipodocs.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { TipodocsCreateDto } from '../dto/tipodocs-create.dto';
import { TipodocsUpdateDto } from '../dto/tipodocs-update.dto';

@Controller('api/v1/tipodocs')
export class TipodocsController {
  constructor(private readonly tipodocsService: TipodocsService) {}

  //Get Tipo de documentos: http://localhost:3000/api/v1/tipodocs
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadTipoDocs))
  async getTipoDocs() {
    return await this.tipodocsService.listTipDoc();
  }

  //Add Tipo de documento(POST): http://localhost:3000/api/v1/tipodocs
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateTipoDocs))
  async createTipoDocs(
    @Res() res,
    @Body()
    create: TipodocsCreateDto,
  ) {
    const response = await this.tipodocsService.createTipDoc(create);
    return res.status(HttpStatus.OK).json({
      message: 'El tipo de documento ha sido creado éxitosamente.',
      response,
    });
  }

  //Update Tipo de documento(PUT): http://localhost:3000/api/v1/tipodocs/1
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateTipoDocs))
  async updateTipoDocs(
    @Res() res,
    @Param('id') id: number,
    @Body()
    update: TipodocsUpdateDto,
  ) {
    const response = await this.tipodocsService.updateTipDoc(id, update);
    return res.status(HttpStatus.OK).json({
      message: 'El tipo de documento ha sido actualizado éxitosamente.',
      response,
    });
  }

  //Patch Tipo de documentos: http://localhost:3000/api/v1/tipodocs/disable/1
  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.DesactivateTipoDocs))
  async desactTipoDocs(@Res() res, @Param('id') id: number) {
    const response = await this.tipodocsService.disableTipDoc(id);
    return res.status(HttpStatus.OK).json({
      message: 'El tipo de documento ha sido desactivado correctamente.',
      response,
    });
  }

  //Patch Tipo de documentos: http://localhost:3000/api/v1/tipodocs/enable/1
  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.RestoreTipoDocs))
  async activTipoDocs(@Res() res, @Param('id') id: number) {
    const response = await this.tipodocsService.enableTipDoc(id);
    return res.status(HttpStatus.OK).json({
      message: 'El tipo de documento ha sido activado correctamente.',
      response,
    });
  }
}
