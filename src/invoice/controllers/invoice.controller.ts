import { Controller, Get, Res } from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { Response } from 'express';

@Controller('api/v1/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async getExample(@Res() res: Response) {
    const response = await this.invoiceService.getExample();
    return res.status(200).json(response);
  }
}
