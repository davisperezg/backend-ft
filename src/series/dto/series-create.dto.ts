import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SeriesCreateDto {
  @IsArray()
  @MaxLength(4, {
    each: true,
    message: 'La serie debe completarse con 4 caracteres.',
  })
  @MinLength(4, {
    each: true,
    message: 'La serie debe completarse con 4 caracteres.',
  })
  @IsString({
    each: true,
    message: 'Las series deben contener una cadena de texto.',
  })
  @ArrayMinSize(1, {
    message: 'La serie debe contener minimo un valor.',
  })
  @IsNotEmpty({ message: 'La serie no debe estar vacio.' })
  series: string[];

  @IsInt({
    message: 'El documento debe contener un valor.',
  })
  @IsNotEmpty({ message: 'El documento no debe estar vacio.' })
  documento: number;
}
