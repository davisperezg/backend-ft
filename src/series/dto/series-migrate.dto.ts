import { IsArray, IsInt, IsNotEmpty, IsObject } from 'class-validator';
import { IsRecord } from 'src/lib/decorators/records';
export class SeriesMigrateDto {
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
  @IsRecord()
  @IsObject({ message: 'Los elementos POS debe ser un objeto.' })
  @IsNotEmpty({ message: 'No existe elementos POS en la data.' })
  documentos: Record<string, string[]>;

  @IsInt({
    message: 'El POS de destino debe contener un valor entero y válido.',
  })
  @IsNotEmpty({ message: 'El POS de destino no debe estar vacio.' })
  pos_destino: number;
}
