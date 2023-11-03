import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  Put,
  Patch,
} from '@nestjs/common';
import { TipodocsEmpresaService } from '../services/tipodocs_empresa.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';

@Controller('api/v1/tipodocs-empresa')
export class TipodocsEmpresaController {
  constructor(private readonly tipodocsEmpService: TipodocsEmpresaService) {}

  @Get(':id')
  @UseGuards(PermissionGuard(Permission.CreateTipoDocs))
  async getTipoDocsByEmpresa(@Res() res, @Param('id') id: number) {
    const response = await this.tipodocsEmpService.getDocuments(id);
    return res.status(HttpStatus.OK).json(response);
  }

  //Add Document to empresa(POST): http://localhost:3000/api/v1/tipodocs-empresa
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateTipoDocs))
  async createTipoDocs(
    @Res() res,
    @Body()
    create: any,
  ) {
    const response = await this.tipodocsEmpService.createDocument(create);
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido creado éxitosamente.',
      response,
    });
  }

  //Add Document to empresa(POST): http://localhost:3000/api/v1/tipodocs-empresa
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateTipoDocs))
  async updateTipoDocs(
    @Res() res,
    @Param('id') id: number,
    @Body()
    update: any,
  ) {
    const response = await this.tipodocsEmpService.updateDocument(id, update);
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido actualizado éxitosamente.',
      response,
    });
  }

  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  async desactDocument(@Res() res, @Param('id') id: number) {
    const response = await this.tipodocsEmpService.desactivateDocument(id);
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido desactivado correctamente.',
      response,
    });
  }

  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  async activDocument(@Res() res, @Param('id') id: number) {
    const response = await this.tipodocsEmpService.activateDocument(id);
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido activado correctamente.',
      response,
    });
  }
}
