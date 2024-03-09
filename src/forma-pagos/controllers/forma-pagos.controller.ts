import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { FormaPagosService } from '../services/forma-pagos.service';

//base: http://localhost:3000/api/v1/forma-pagos
@Controller('api/v1/forma-pagos')
export class FormaPagosController {
  constructor(private readonly formaPagosService: FormaPagosService) {}

  // Get Groups: http://localhost:3000/api/v1/forma-pagos
  @Get()
  @UseGuards()
  async getListFormaPagos(@Res() res) {
    const formaPagos = await this.formaPagosService.listFormaPagos();
    return res.status(HttpStatus.OK).json(formaPagos);
  }
}
