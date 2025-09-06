import { InvoiceEntity } from '../entities/invoice.entity';

export class QueryResultInvoice {
  invoice: InvoiceEntity;
  fileName: string;
  message: string;
  codigo_respuesta_sunat: string;
  codigo_respuesta_sunat_int: number;
  documento: string;
  serie: string;
  correlativo: string;
  correlativo_registrado: string;
  total: string;
  xml: string;
  cdr: string;
  pdfA4: string;
  sendMode: string;
}
