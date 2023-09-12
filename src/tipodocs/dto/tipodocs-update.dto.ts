import { IsOptional, IsString } from 'class-validator';

export class TipodocsUpdateDto {
  @IsString({
    message: 'El codigo debe contener una cadena de texto.',
  })
  @IsOptional()
  codigo: string;

  @IsString({
    message: 'El tipo de documento debe contener una cadena de texto.',
  })
  @IsOptional()
  tipo_documento: string;

  @IsString({
    message: 'El abreviado debe contener una cadena de texto.',
  })
  @IsOptional()
  abreviado?: string;
}
