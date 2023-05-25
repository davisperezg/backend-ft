import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsInt,
} from 'class-validator';
import { IsMatchPassword } from 'src/lib/decorators/match-password.decorator';

export class CreateUserDTO {
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

  //CONTRASENIA
  // @Matches(/((?=.*\d)(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
  //   message:
  //     'La contraseña debe contener una mayúscula, números y caracter especial',
  // })
  @MaxLength(200, {
    message:
      'La contraseña del usuario debe ser igual o menor a 200 caracteres',
  })
  @MinLength(8, {
    message: 'La contraseña del usuario debe ser igual o mayor a 8 caracteres',
  })
  @IsString({
    message: 'La contraseña del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese la contraseña del usuario' })
  password: string;

  //CONFIRMAR PASSWORD
  @IsMatchPassword('password', {
    message:
      'La confirmación de contraseña no coincide con la contraseña ingresada',
  })
  @MaxLength(200, {
    message:
      'La confirmación de contraseña del usuario debe ser igual o menor a 200 caracteres',
  })
  @MinLength(8, {
    message:
      'La confirmación de contraseña del usuario debe ser igual o mayor a 8 caracteres',
  })
  @IsString({
    message:
      'La confirmación de contraseña del usuario debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor, confirme contraseña' })
  confirm_password: string;

  //TELEFONO_MOVIL_1
  // @Matches(/^(9[0-9]{8})+$/, {
  //   message: 'Ingrese un telefono móvil válido',
  // })
  // @MaxLength(9, {
  //   message: 'El telefono móvil del usuario debe ser igual a 9 caracteres',
  // })
  // @MinLength(9, {
  //   message: 'El telefono móvil del usuario debe ser igual a 9 caracteres',
  // })
  // @IsString({
  //   message: 'El telefono móvil del usuario debe contener una cadena de texto',
  // })
  // @IsNotEmpty({ message: 'Por favor, ingrese el número de telefono móvil' })
  // telefono_movil_1: string;

  @IsString({
    message: 'El rol debe contener un id válido',
  })
  @IsNotEmpty({ message: 'Por favor, ingrese el rol del usuario' })
  role: string;
}
