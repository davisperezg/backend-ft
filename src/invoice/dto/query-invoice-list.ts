import { QueryDetailsInvoice } from './query-detail-invoice-list';

export class QueryInvoiceList {
  id: number;
  tipo_operacion: string;
  serie: string;
  correlativo: string;
  fecha_vencimiento: Date | null;
  mto_operaciones_gravadas: number;
  mto_operaciones_exoneradas: number;
  mto_operaciones_inafectas: number;
  mto_operaciones_exportacion: number;
  mto_operaciones_gratuitas: number;
  mto_igv: number;
  mto_igv_gratuitas: number;
  porcentaje_igv: number;
  estado_operacion: number;
  estado_anulacion: number | null;
  respuesta_sunat_codigo: string;
  respuesta_sunat_descripcion: string;
  respuesta_anulacion_codigo: string | null;
  respuesta_anulacion_descripcion: string | null;
  observaciones_sunat: string | null;
  observaciones:
    | {
        observacion: string;
        uuid: string;
      }[]
    | null;
  // entidad: string | null;
  // entidad_tipo: string | null;
  // entidad_documento: string | null;
  // entidad_direccion: string | null;
  borrador: boolean;
  documento: string;
  tipo_documento: string;
  cliente: string;
  cliente_cod_doc: string;
  cliente_num_doc: string;
  cliente_direccion: string;
  empresa: number;
  establecimiento: number;
  pos: number;
  envio_sunat_modo: string;
  moneda_abrstandar: string;
  moneda_simbolo: string;
  forma_pago: string;
  usuario: string;
  details: QueryDetailsInvoice[];
  status: boolean;
  xml: string | null;
  cdr: string | null;
  pdfA4: string | null;
  fecha_registro: Date;
  fecha_emision: Date;
}
