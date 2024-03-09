import { Controller, Get, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { IgvsService } from '../services/igvs.service';

//base: http://localhost:3000/api/v1/igvs
@Controller('api/v1/igvs')
export class IgvsController {
  constructor(private readonly igvsService: IgvsService) {}

  // Get Groups: http://localhost:3000/api/v1/igvs
  @Get()
  @UseGuards()
  async getListIgvs(@Res() res) {
    const igvs = await this.igvsService.listIgvs();
    return res.status(HttpStatus.OK).json(igvs);
  }
}
