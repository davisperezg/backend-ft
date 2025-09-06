import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InvoiceService } from 'src/invoice/services/invoice.service';
import { SunatService } from '../../sunat/services/sunat.service';
import { QueryResultInvoice } from '../dto/query-result-invoice';
import { QueryInvoiceList } from '../dto/query-invoice-list';
import { withRetry } from 'src/lib/functions';

@Processor('invoice-submission')
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly sunatService: SunatService,
  ) {}

  @Process('submitInvoice')
  async handleSunatSubmission(
    job: Job<{
      invoiceId: number;
      roomId: string;
      fileName: string;
      xmlSigned: string;
      xmlUnsigned: string;
      sendMode: string;
    }>,
  ): Promise<QueryResultInvoice> {
    const { invoiceId, roomId, fileName, xmlSigned, xmlUnsigned, sendMode } =
      job.data;

    this.logger.log(`Procesando envío a SUNAT para factura ID: ${invoiceId}`);

    try {
      // 1. Recuperar factura actualizada de la base de datos
      const invoice = await this.invoiceService.findOneInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error(`No se encontró la factura con ID: ${invoiceId}`);
      }

      // 2. Procesar envío a SUNAT
      const sunatResponse = await this.sunatService.processSendSunat(
        invoice,
        roomId,
        fileName,
        xmlSigned,
        xmlUnsigned,
        sendMode,
      );

      this.logger.log(
        `Factura ID: ${invoiceId} procesada correctamente en SUNAT`,
      );

      return sunatResponse;
    } catch (error) {
      this.logger.error(
        `Error procesando envío a SUNAT: ${error.message}`,
        error.stack,
      );
      // Re-lanzar el error para que Bull lo maneje según su configuración de reintentos
      throw error;
    }
  }

  @Process('submitInvoiceManual')
  async handleSunatSubmissionManual(
    job: Job<{
      invoiceId: number;
      roomId: string;
      sendMode: string;
    }>,
  ): Promise<QueryResultInvoice> {
    const { invoiceId, roomId, sendMode } = job.data;

    this.logger.log(
      `Procesando envío a SUNAT MANUAL para factura ID: ${invoiceId}`,
    );

    try {
      // 1. Recuperar factura actualizada de la base de datos
      const invoice = await this.invoiceService.findOneInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error(
          `No se encontró la factura con ID: ${invoiceId} - MANUAL`,
        );
      }

      const validation = await this.sunatService.validateInvoiceFactura(
        invoice,
      );

      const { fileName, xmlSigned, xmlUnsigned } = validation;

      // 2. Procesar envío a SUNAT
      const sunatResponse = await this.sunatService.processSendSunat(
        invoice,
        roomId,
        fileName,
        xmlSigned,
        xmlUnsigned,
        sendMode,
      );

      this.logger.log(
        `Factura ID: ${invoiceId} procesada correctamente en SUNAT MANUAL`,
      );

      return sunatResponse;
    } catch (error) {
      this.logger.error(
        `Error procesando envío a SUNAT MANUAL: ${error.message}`,
        error.stack,
      );
      // Re-lanzar el error para que Bull lo maneje según su configuración de reintentos
      throw error;
    }
  }
}
