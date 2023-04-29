import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  Matches,
  ArrayMinSize,
} from 'class-validator';

export class UpdateModuleDTO {
  //NOMBRE
  @Matches(/^[A-Za-z0-9Ññ\s]+$/, {
    message:
      'El nombre del rol solo puede contener letras y números sin tildes',
  })
  @MaxLength(45, {
    message: 'El nombre del rol debe ser igual o menor a 45 caracteres',
  })
  @MinLength(3, {
    message: 'El nombre del rol debe ser igual o mayor a 3 caracteres',
  })
  @IsString({
    message: 'El nombre del rol debe contener una cadena de texto',
  })
  @IsOptional()
  name?: string;

  //DETALLE
  @MaxLength(150, {
    message: 'La descripción del rol debe ser igual o menor a 150 caracteres',
  })
  @IsString({
    message: 'La descripción del rol debe contener una cadena de texto',
  })
  @IsOptional()
  description?: string;

  //MENUS
  @IsString({
    each: true,
    message: 'Los módulos del rol no contiene un id correcto',
  })
  @ArrayMinSize(1, { message: 'El rol debe contener minimo 1 módulo' })
  @IsArray({ message: 'Los módulos del rol debe ser un array' })
  @IsOptional()
  module?: string[];
}
