import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class EstablecimientoCreateDto {
  @IsString({
    message: 'El código debe contener una cadena de texto.',
  })
  @IsOptional()
  codigo: string;

  @IsString({
    message: 'La denominación debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La denominacion no debe estar vacio.' })
  denominacion: string;

  @IsString({
    message: 'El departamento debe contener una cadena de texto.',
  })
  @IsOptional()
  departamento: string;

  @IsString({
    message: 'La provincia debe contener una cadena de texto.',
  })
  @IsOptional()
  provincia: string;

  @IsString({
    message: 'El distrito debe contener una cadena de texto.',
  })
  @IsOptional()
  distrito: string;

  @IsString({
    message: 'La dirección debe contener una cadena de texto.',
  })
  @IsOptional()
  direccion: string;

  @IsString({
    message: 'El ubigeo debe contener una cadena de texto.',
  })
  @IsOptional()
  ubigeo: string;

  //empresa
  @IsInt({
    message: 'La empresa debe contener un valor entero y válido.',
  })
  @IsNotEmpty({
    message: 'La empresa no debe estar vacio.',
  })
  empresa: number;

  @IsBoolean()
  estado?: boolean;
}
