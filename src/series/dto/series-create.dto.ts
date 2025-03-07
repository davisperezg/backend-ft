import { IsArray, IsInt, IsNotEmpty } from 'class-validator';
export class SeriesCreateDto {
  @IsInt({
    message: 'La empresa debe contener un valor entero y válido.',
  })
  @IsNotEmpty({ message: 'La empresa no debe estar vacia.' })
  empresa: number;

  @IsInt({
    message:
      'El establecimiento de la empresa debe contener un valor entero y válido.',
  })
  @IsNotEmpty({ message: 'El establecimiento no debe estar vacio.' })
  establecimiento: number;

  //@Validate(RecordValidator, [SerieDTO]) - Record<string, string[]>
  @IsArray({ message: 'Los elementos deben existir.' })
  @IsNotEmpty({ message: 'Los elementos no deben estar vacio.' })
  pos: {
    id: number;
    nombre: string;
    documentos: {
      id: number;
      nombre: string;
      series: {
        id: number;
        serie: string;
      }[];
    }[];
  }[];
}
