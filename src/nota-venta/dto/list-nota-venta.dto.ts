import { DetailNotaVentaDto } from './detail-nota-venta.dto';

export class ListNotaVentaDto {
  id: number;
  tipo_operacion: string;
  serie: string;
  correlativo: string;
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
  observaciones:
    | {
        observacion: string;
        uuid: string;
      }[]
    | null;
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
  usuario: string;
  details: DetailNotaVentaDto[];
  status: boolean;
  pdf80mm: string | null;
  pdf58mm: string | null;
  fecha_registro: Date;
  fecha_emision: Date;
}
