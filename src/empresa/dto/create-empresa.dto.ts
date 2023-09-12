import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateEmpresaDTO {
  //ruc
  @Matches(/^(20|10)\d{9}$/, {
    message: 'El RUC debe ser válido.',
  })
  @MaxLength(11, {
    message: 'El RUC debe contener 11 caracteres.',
  })
  @MinLength(11, {
    message: 'El RUC debe contener 11 caracteres.',
  })
  @IsString({
    message: 'El RUC debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El RUC no debe estar vacio.' })
  ruc: string;

  //razon_social
  @IsString({
    message: 'La razon social debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La razon social no debe estar vacio.' })
  razon_social: string;

  //nombre_comercial
  @IsString({
    message: 'El nombre comercial debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El nombre comercial no debe estar vacio.' })
  nombre_comercial: string;

  //web_service
  @Matches(/^(http|https):\/\/[\w\-\.]+\.\w{2,}(\/.*)?$/, {
    message: 'El link del web_service debe ser valido.',
  })
  @IsString({
    message: 'El link del web_service debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El link del web_service no debe estar vacio.' })
  @ValidateIf((empresa) => empresa.ose_enabled)
  web_service: string;

  //cert_password
  @IsString({
    message: 'La contraseña del certificado debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La contraseña del certificado no debe estar vacia.' })
  @ValidateIf((empresa) => empresa.modo === 1)
  cert_password: string;

  //modo
  @IsInt({
    message: 'El modo de la empresa debe contener un valor.',
  })
  modo: number;

  //ose_enabled
  @IsBoolean({
    message:
      'Para habilitar OSE a una empresa debe contener un valor afirmativo/negativo.',
  })
  ose_enabled: boolean;

  //usu_secundario_user
  @IsString({
    message: 'El usuario secundario debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El usuario secundario no debe estar vacio.' })
  @IsOptional()
  @ValidateIf((empresa) => empresa.modo === 1 && empresa.ose_enabled === false)
  usu_secundario_user: string;

  //usu_secundario_password
  @IsString({
    message:
      'La contraseña de usuario secundario debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'La contraseña del usuario secundario no debe estar vacio.',
  })
  @IsOptional()
  @ValidateIf((empresa) => empresa.modo === 1 && empresa.ose_enabled === false)
  usu_secundario_password: string;

  //OSE
  //usu_secundario_user
  @IsString({
    message: 'OSE - El usuario secundario debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'OSE - El usuario secundario no debe estar vacio.' })
  @IsOptional()
  @ValidateIf((empresa) => empresa.modo === 1 && empresa.ose_enabled)
  usu_secundario_ose_user: string;

  //usu_secundario_password
  @IsString({
    message:
      'OSE - La contraseña de usuario secundario debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'OSE - La contraseña del usuario secundario no debe estar vacio.',
  })
  @IsOptional()
  @ValidateIf((empresa) => empresa.modo === 1 && empresa.ose_enabled)
  usu_secundario_ose_password: string;

  //usuario
  @IsInt({
    message: 'El usuario de la empresa debe contener un valor.',
  })
  @IsNotEmpty({
    message: 'El usuario no debe estar vacio.',
  })
  user: number;

  //ubigeo
  @IsString({
    message: 'El ubigeo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El ubigeo no debe estar vacio.' })
  ubigeo: string;

  //urbanizacion
  @IsString({
    message: 'La urbanizacion debe contener una cadena de texto.',
  })
  @IsOptional()
  urbanizacion: string;

  //correo
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'El correo debe ser válido.',
  })
  @IsOptional()
  correo: string;

  //telefono_movil_1
  @Matches(/^9\d{8}$/, {
    message: 'El celular_1 debe ser válido.',
  })
  @IsOptional()
  telefono_movil_1: string;

  //telefono_movil_2
  @Matches(/^9\d{8}$/, {
    message: 'El celular_2 debe ser válido.',
  })
  @IsOptional()
  telefono_movil_2: string;

  //Telefono fijo1
  @IsString({
    message: 'El telefono fijo_1 debe contener una cadena de texto.',
  })
  @IsOptional()
  telefono_fijo_1: string;

  //Telefono fijo2
  @IsString({
    message: 'El telefono fijo_2 debe contener una cadena de texto.',
  })
  @IsOptional()
  telefono_fijo_2: string;
}
