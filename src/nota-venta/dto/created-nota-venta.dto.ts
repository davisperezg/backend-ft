import { NotaVentaEntity } from '../entities/nota-venta.entity';

export class CreatedNotaVentaDto {
  notaVenta: NotaVentaEntity;
  fileName: string;
  message: string;
  documento: string;
  codigo_respuesta: string;
  serie: string;
  correlativo: string;
  correlativo_registrado: string;
  total: string;
  pdf80mm: string;
  pdf58mm: string;
  sendMode: string;
}
