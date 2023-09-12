import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SeriesCreateDto {
  @IsString({
    message: 'La serie debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La serie no debe estar vacio.' })
  serie: string;

  @IsInt({
    message: 'El documento debe contener un valor.',
  })
  @IsNotEmpty({ message: 'El documento no debe estar vacio.' })
  documento: number;
}
