import { IsInt, IsNotEmpty, IsObject } from 'class-validator';
import { IsRecord } from 'src/lib/decorators/records';
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

  //@Validate(RecordValidator, [SerieDTO])
  @IsRecord()
  @IsObject({ message: 'El documento debe ser un objeto.' })
  @IsNotEmpty({ message: 'El documento no debe estar vacio.' })
  documentos: Record<string, string[]>;
}
