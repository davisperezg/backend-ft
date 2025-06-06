import {
  Controller,
  Get,
  Res,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  StreamableFile,
  Header,
  Query,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { Response } from 'express';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import PdfPrinter from 'pdfmake';
import * as fs from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { CreateComuBajaDTO } from '../dto/create-comunicacion_baja';

@Controller('api/v1/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // @Post('bajadirecto')
  // async bajaDirecto(
  //   @Res() res: Response,
  //   @Body()
  //   data: {
  //     empresaId: number;
  //     establecimientoId: number;
  //   },
  // ) {
  //   const { empresaId, establecimientoId } = data;
  //   const response = await this.invoiceService.bajaAux(
  //     empresaId,
  //     establecimientoId,
  //   );
  //   return res.status(200).json(response);
  // }

  @Post()
  @UseGuards(PermissionGuard(Permission.CreateFacturas))
  async createFactura(
    @Res() res: Response,
    @Body() createInvoices: CreateInvoiceDto,
    @CtxUser() user: QueryToken,
  ) {
    const response = await this.invoiceService.upsertSale(createInvoices, user);
    return res.status(200).json(response);
  }

  // @Post('comunicar-baja')
  // @UseGuards(PermissionGuard(Permission.CreateFacturas))
  // async comunicarBaja(@Res() res: Response, @Body() body: CreateComuBajaDTO) {
  //   const response = await this.invoiceService.comunicarBaja(body);
  //   return res.status(200).json(response);
  // }

  //https://stackoverflow.com/questions/54958244/how-to-use-query-parameters-in-nest-js
  @Get()
  @UseGuards(PermissionGuard(Permission.ListInvoices))
  async listInvoices(
    @CtxUser() user: QueryToken,
    @Query('empresa') empresa: number,
    @Query('establecimiento') establecimiento: number,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.invoiceService.listInvoices(
      user,
      empresa,
      establecimiento,
      page,
      limit,
    );
  }

  @Get()
  //@UseGuards(PermissionGuard(Permission.CreateInvoices))
  async getPdf(@Res() res: Response) {
    // Configura las opciones del encabezado y el nombre del archivo PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=ejemplo.pdf');

    //const file = fs.createReadStream(join(process.cwd(), 'package.json'));
    //file.pipe(res);
    const fonts = {
      Roboto: {
        normal: 'src/utils/fonts/Roboto-Regular.ttf',
        bold: 'src/utils/fonts/Roboto-Medium.ttf',
        italics: 'src/utils/fonts/Roboto-Italic.ttf',
        bolditalics: 'src/utils/fonts/Roboto-MediumItalic.ttf',
      },
    };

    const docDefinition = {
      content: 'This is an sample PDF printed with pdfMake',
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    fs.mkdirSync('files/jessica/jessica/facturas/PDF/A4/', { recursive: true });
    const stream = fs.createWriteStream(
      'files/jessica/jessica/facturas/PDF/A4/document.pdf',
    );
    pdfDoc.pipe(stream);
    pdfDoc.end();
    pdfDoc.pipe(res);
  }
}
