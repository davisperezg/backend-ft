import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { UnidadesService } from '../services/unidades.service';

//base: http://localhost:3000/api/v1/unidades
@Controller('api/v1/unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  // Get Groups: http://localhost:3000/api/v1/unidades
  @Get()
  @UseGuards()
  async getListUnidades(@Res() res) {
    const igvs = await this.unidadesService.listUnidades();
    return res.status(HttpStatus.OK).json(igvs);
  }
}
