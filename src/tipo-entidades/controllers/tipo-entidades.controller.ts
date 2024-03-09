import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { TipoEntidadService } from '../services/tipo-entidades.service';

//base: http://localhost:3000/api/v1/tipo-entidades
@Controller('api/v1/tipo-entidades')
export class TipoEntidadController {
  constructor(private readonly tipoEntidadService: TipoEntidadService) {}

  // Get Groups: http://localhost:3000/api/v1/tipo-entidades
  @Get()
  @UseGuards()
  async getListTipoEntidades(@Res() res) {
    const igvs = await this.tipoEntidadService.listTipoEntidades();
    return res.status(HttpStatus.OK).json(igvs);
  }
}
