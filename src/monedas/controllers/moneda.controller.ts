import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { MonedasService } from '../services/monedas.service';

//base: http://localhost:3000/api/v1/monedas
@Controller('api/v1/monedas')
export class MonedasController {
  constructor(private readonly monedasService: MonedasService) {}

  // Get Groups: http://localhost:3000/api/v1/monedas
  @Get()
  @UseGuards()
  async getListMonedas(@Res() res) {
    const igvs = await this.monedasService.listMonedas();
    return res.status(HttpStatus.OK).json(igvs);
  }
}
