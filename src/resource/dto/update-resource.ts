import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateResourceDTO {
  //GROUP_RESOURCE
  @IsString({
    message: 'El nombre del permiso debe contener una cadena de texto.',
  })
  @IsOptional()
  group_resource: string;

  //NOMBRE
  @Matches(/^[A-Za-zÑñ\s]+$/, {
    message: 'El nombre del permiso solo puede contener letras.',
  })
  @MaxLength(45, {
    message: 'El nombre del permiso debe ser igual o menor a 45 caracteres.',
  })
  @MinLength(3, {
    message: 'El nombre del permiso debe ser igual o mayor a 3 caracteres.',
  })
  @IsString({
    message: 'El nombre del permiso debe contener una cadena de texto.',
  })
  @IsOptional()
  name: string;

  //DETALLE
  @MaxLength(150, {
    message: 'El detalle del permiso debe ser igual o menor a 150 caracteres.',
  })
  @IsString({
    message: 'El detalle del permiso debe contener una cadena de texto.',
  })
  @IsOptional()
  description?: string;

  //KEY
  @Matches(/^[A-Za-z_]+$/, {
    message: 'El key solo permite letras y sin espacios en blanco.',
  })
  @MaxLength(45, {
    message: 'El key del permiso debe ser igual o menor a 45 caracteres.',
  })
  @MinLength(3, {
    message: 'El key del permiso debe ser igual o mayor a 3 caracteres.',
  })
  @IsString({
    message: 'El key del permiso debe contener una cadena de texto.',
  })
  @IsOptional()
  key: string;
}
