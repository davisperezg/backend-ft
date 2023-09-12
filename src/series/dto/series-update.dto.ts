import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SeriesUpdateDto {
  @IsString({
    message: 'La serie debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La serie no debe estar vacio.' })
  @IsOptional()
  serie: string;

  @IsInt({
    message: 'El documento debe contener un valor.',
  })
  @IsNotEmpty({ message: 'El documento no debe estar vacio.' })
  @IsOptional()
  documento: number;
}
