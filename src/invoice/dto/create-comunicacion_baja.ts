import { IsNotEmpty, IsString } from 'class-validator';

export class CreateComuBajaDTO {
  @IsString({
    message: 'El CPE debe tener una serie.',
  })
  @IsNotEmpty({ message: 'Por favor ingrese la serie.' })
  serie: string;

  @IsString({
    message: 'El CPE debe tener un numero.',
  })
  @IsNotEmpty({ message: 'Por favor ingrese el numero.' })
  numero: string;

  @IsString({
    message: 'El motivo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete el motivo.' })
  motivo: string;
}
