import { IsOptional, IsString } from 'class-validator';

export class TipodocsUpdateDto {
  @IsString({
    message: 'El codigo debe contener una cadena de texto.',
  })
  @IsOptional()
  codigo: string;

  @IsString({
    message: 'El nombre debe contener una cadena de texto.',
  })
  @IsOptional()
  nombre: string;

  @IsString({
    message: 'El abreviado debe contener una cadena de texto.',
  })
  @IsOptional()
  abreviado?: string;
}
