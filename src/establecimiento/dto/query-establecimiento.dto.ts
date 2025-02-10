export class EstablecimientoListDTO {
  id: number;
  codigo: string;
  denominacion: string;
  departamento: {
    value: string;
    label: string;
  };
  provincia: {
    value: string;
    label: string;
  };
  distrito: {
    value: string;
    label: string;
  };
  direccion: string;
  logo: {
    name: string;
  }[];
  ubigeo: string;
  estado: boolean;
}
