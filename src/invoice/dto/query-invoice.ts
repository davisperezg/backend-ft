import { QueryInvoiceList } from './query-invoice-list';

export class QueryInvoice {
  statusCode: string;
  pageSize: number;
  pageCount: number;
  rowCount: number;
  items: QueryInvoiceList[];
}
