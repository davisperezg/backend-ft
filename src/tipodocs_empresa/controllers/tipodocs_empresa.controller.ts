import {
  Controller,
  HttpStatus,
  Param,
  Res,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { TipodocsEmpresaService } from '../services/tipodocs_empresa.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { QueryToken } from 'src/auth/dto/queryToken';

@Controller('api/v1/tipodocs-empresa')
export class TipodocsEmpresaController {
  constructor(private readonly tipodocsEmpService: TipodocsEmpresaService) {}

  // @Get(':id')
  // @UseGuards(PermissionGuard(Permission.CreateTipoDocs))
  // async getTipoDocsByEmpresa(@Res() res, @Param('id') id: number) {
  //   const response = await this.tipodocsEmpService.getDocuments(id);
  //   return res.status(HttpStatus.OK).json(response);
  // }

  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  async desactDocument(
    @Res() res,
    @Param('id') id: number,
    @CtxUser() userToken: QueryToken,
  ) {
    const response = await this.tipodocsEmpService.desactivateDocument(
      id,
      userToken,
    );
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido desactivado correctamente.',
      response,
    });
  }

  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  async activDocument(
    @Res() res,
    @Param('id') id: number,
    @CtxUser() userToken: QueryToken,
  ) {
    const response = await this.tipodocsEmpService.activateDocument(
      id,
      userToken,
    );
    return res.status(HttpStatus.OK).json({
      message: 'El documento ha sido activado correctamente.',
      response,
    });
  }
}
