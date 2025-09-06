import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InvoiceService } from 'src/invoice/services/invoice.service';
import { SunatService } from '../../sunat/services/sunat.service';
import { QueryResultInvoice } from '../dto/query-result-invoice';

@Processor('job-sunat-submission-scheduled')
export class SunatScheduledProcessor {
  private readonly logger = new Logger(SunatScheduledProcessor.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly sunatService: SunatService,
  ) {}

  @Process('submitSunatScheduled')
  async handleSunatSubmission(
    job: Job<{
      invoiceId: number;
      roomId: string;
      fileName: string;
      xmlSigned: string;
      xmlUnsigned: string;
      sendMode: string;
      sendModeDoc: string;
      saveXMLs: boolean;
    }>,
  ): Promise<QueryResultInvoice> {
    const {
      invoiceId,
      roomId,
      fileName,
      xmlSigned,
      xmlUnsigned,
      sendMode,
      saveXMLs,
    } = job.data;

    this.logger.log(
      `Procesando envío a SUNAT PROGRAMADO para factura ID: ${invoiceId}`,
    );

    try {
      // 1. Recuperar factura actualizada de la base de datos
      const invoice = await this.invoiceService.findOneInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error(
          `No se encontró la factura con ID: ${invoiceId} - PROGRAMADO`,
        );
      }

      // 2. Procesar envío a SUNAT
      const sunatResponse = await this.sunatService.processSendSunat(
        invoice,
        roomId,
        fileName,
        xmlSigned,
        xmlUnsigned,
        sendMode,
        saveXMLs,
      );

      this.logger.log(
        `Factura ID: ${invoiceId} procesada correctamente en SUNAT PROGRAMADO`,
      );

      return sunatResponse;
    } catch (error) {
      this.logger.error(
        `Error procesando envío a SUNAT PROGRAMADO: ${error.message}`,
        error.stack,
      );
      // Re-lanzar el error para que Bull lo maneje según su configuración de reintentos
      throw error;
    }
  }

  @Process('submitSunatScheduledWithValidation')
  async handleSunatSubmissionManual(
    job: Job<{
      invoiceId: number;
      roomId: string;
      sendMode: string;
      sendModeDoc: string;
    }>,
  ): Promise<QueryResultInvoice> {
    const { invoiceId, roomId, sendMode } = job.data;

    this.logger.log(
      `Procesando envío a SUNAT PROGRAMADO para factura ID: ${invoiceId}`,
    );

    try {
      // 1. Recuperar factura actualizada de la base de datos
      const invoice = await this.invoiceService.findOneInvoiceById(invoiceId);

      if (!invoice) {
        throw new Error(
          `No se encontró la factura con ID: ${invoiceId} - PROGRAMADO`,
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
        `Factura ID: ${invoiceId} procesada correctamente en SUNAT PROGRAMADO`,
      );

      return sunatResponse;
    } catch (error) {
      this.logger.error(
        `Error procesando envío a SUNAT PROGRAMADO: ${error.message}`,
        error.stack,
      );
      // Re-lanzar el error para que Bull lo maneje según su configuración de reintentos
      throw error;
    }
  }
}
