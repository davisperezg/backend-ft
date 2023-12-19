import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsOptional,
} from 'class-validator';

export class UpdateUserDTO {
  //NOMBRE
  @Matches(/^[A-Za-zÑñ\s]+$/, {
    message: 'El nombre del usuario solo puede contener letras',
  })
  @MaxLength(45, {
    message: 'El nombre del usuario debe ser igual o menor a 45 caracteres',
  })
  @MinLength(3, {
    message: 'El nombre del usuario debe ser igual o mayor a 3 caracteres',
  })
  @IsString({
    message: 'El nombre del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese los nombres del usuario' })
  name: string;

  //APELLIDOS
  @Matches(/^[A-Za-zÑñ\s]+$/, {
    message: 'El apellido del usuario solo puede contener letras',
  })
  @MaxLength(45, {
    message: 'El apellido del usuario debe ser igual o menor a 45 caracteres',
  })
  @MinLength(3, {
    message: 'El apellido del usuario debe ser igual o mayor a 3 caracteres',
  })
  @IsString({
    message: 'El apellido del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese los apellidos del usuario' })
  lastname: string;

  @IsString({
    message: 'El tipo de documento debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese tipo de documento' })
  tipDocument: string;

  //DNI
  @Matches(/^[0-9\s]+$/, {
    message: 'El dni del usuario solo puede contener números',
  })
  @MaxLength(8, {
    message: 'El dni del usuario debe ser igual a 8 caracteres',
  })
  @MinLength(8, {
    message: 'El dni del usuario debe ser igual a 8 caracteres',
  })
  @IsString({
    message: 'El dni del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el dni del usuario' })
  nroDocument: string;

  //EMAIL
  @IsEmail({}, { message: 'Correo inválido' })
  @IsString({
    message: 'El correo del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el correo del usuario' })
  email: string;

  //USUARIO
  @Matches(/^[A-Za-zÑñ\s0-9]+$/, {
    message: 'El usuario solo puede contener letras y números',
  })
  @MaxLength(15, {
    message: 'El usuario debe ser igual o menor a 15 caracteres',
  })
  @MinLength(5, {
    message: 'El usuario debe ser igual o mayor a 5 caracteres',
  })
  @IsString({
    message: 'El usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el usuario' })
  username: string;

  @IsString({
    message: 'El rol debe contener un id válido',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el rol del usuario' })
  role: string;

  @IsOptional()
  empresasAsign?: any[];
}
