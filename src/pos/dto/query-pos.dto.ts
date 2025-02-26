import { EstablecimientoListDTO } from 'src/establecimiento/dto/query-establecimiento.dto';

export class POSListDTO {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
  establecimiento: Pick<
    EstablecimientoListDTO,
    'id' | 'codigo' | 'denominacion'
  >;
}
