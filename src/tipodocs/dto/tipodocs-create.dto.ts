import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TipodocsCreateDto {
  @IsString({
    message: 'El codigo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El codigo no debe estar vacio.' })
  codigo: string;

  @IsString({
    message: 'El nombre debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El nombre no debe estar vacio.' })
  nombre: string;

  @IsString({
    message: 'El abreviado debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El abreviado no debe estar vacio.' })
  abreviado: string;
}
