import { IsInt, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePosDto {
  @MinLength(3, {
    message: 'El nombre debe contener 3 caracteres como minimo.',
  })
  @IsString({
    message: 'El nombre debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El nombre no debe estar vacio.' })
  nombre: string;

  @MinLength(3, {
    message: 'El codigo debe contener 3 caracteres como minimo.',
  })
  @IsString({
    message: 'El codigo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El codigo no debe estar vacio.' })
  codigo: string;

  @IsInt({
    message: 'El establecimiento debe contener un valor entero.',
  })
  @IsNotEmpty({ message: 'El establecimiento no debe estar vacio.' })
  establecimiento: number;

  @IsInt({
    message: 'La empresa debe contener un valor entero.',
  })
  @IsNotEmpty({ message: 'La empresa no debe estar vacia.' })
  empresa: number;
}
