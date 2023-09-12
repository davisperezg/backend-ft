import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TipodocsCreateDto {
  @IsString({
    message: 'El codigo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El codigo no debe estar vacio.' })
  codigo: string;

  @IsString({
    message: 'El tipo de documento debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El tipo de documento no debe estar vacio.' })
  tipo_documento: string;

  @IsString({
    message: 'El abreviado debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El abreviado no debe estar vacio.' })
  abreviado: string;
}
