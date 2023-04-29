import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsArray,
  Matches,
  ArrayMinSize,
} from 'class-validator';

export class CreateModuleDTO {
  //NOMBRE
  @Matches(/^[A-Za-z0-9Ññ\s]+$/, {
    message:
      'El nombre del módulo solo puede contener letras y números sin tildes',
  })
  @MaxLength(45, {
    message: 'El nombre del módulo debe ser igual o menor a 45 caracteres',
  })
  @MinLength(3, {
    message: 'El nombre del módulo debe ser igual o mayor a 3 caracteres',
  })
  @IsString({
    message: 'El nombre del módulo debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el nombre del módulo' })
  name: string;

  //DETALLE
  @MaxLength(150, {
    message: 'El detalle del módulo debe ser igual o menor a 150 caracteres',
  })
  @IsString({
    message: 'El detalle del módulo debe contener una cadena de texto',
  })
  @IsOptional()
  description?: string;

  //LINK
  @Matches(/^[a-z\s]+$/, {
    message:
      'El link del módulo solo puede contener letras minúsculas y sin caracteres especiales',
  })
  @MaxLength(100, {
    message: 'El link del módulo debe ser igual o menor a 100 caracteres',
  })
  @MinLength(3, {
    message: 'El link del módulo debe ser igual o mayor a 3 caracteres',
  })
  @IsString({
    message: 'El link del módulo debe contener una cadena de texto',
  })
  @IsOptional()
  link?: string;

  //COLOR
  @Matches(/^#[0-9a-zA-Z]+$/, {
    message: 'El color del módulo tiene el siguiente formato "#ffffff"',
  })
  @MaxLength(7, { message: 'El color del módulo debe contener 7 caracteres' })
  @MinLength(7, { message: 'El color del módulo debe contener 7 caracteres' })
  @IsString({
    message: 'El color del módulo debe contener una cadena de texto',
  })
  @IsOptional() //formato#171717
  color?: string;

  //ICON
  @IsString({
    message: 'El icono del módulo debe contener una cadena de texto',
  })
  @IsOptional()
  icon?: string;

  //MENUS
  @IsString({
    each: true,
    message: 'Los menus del módulo no contiene un id correcto',
  })
  @ArrayMinSize(1, { message: 'El módulo debe contener minimo 1 menu' })
  @IsArray({ message: 'El menu del módulo debe ser un array' })
  @IsNotEmpty({ message: 'Por favor, ingrese menus' })
  menu: string[];
}
