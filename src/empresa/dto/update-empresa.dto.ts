import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  Matches,
  IsInt,
  IsBoolean,
  IsOptional,
  ValidateIf,
  IsIn,
} from 'class-validator';

export class UpdateFormDTO {
  @Transform((req) => {
    const parse = JSON.parse(req.value);
    if (typeof parse === 'object') {
      return req.value;
    } else {
      return false;
    }
  })
  @IsString({
    message: 'La data debe ser un objeto válido.',
  })
  @IsNotEmpty({ message: 'Por favor ingrese la data.' })
  data: string;
}

export class UpdateEmpresaDTO {
  //nombre_comercial
  @IsString({
    message: 'El nombre comercial debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El nombre comercial no debe estar vacio.' })
  nombre_comercial: string;

  //domicilio_fiscal
  @IsString({
    message: 'El domicilio fiscal debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El domicilio fiscal no debe estar vacio.' })
  domicilio_fiscal: string;

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
  @IsNotEmpty({ message: 'La urbanizacion no debe estar vacio.' })
  urbanizacion: string;

  //web_service
  @Matches(/^(http|https):\/\/[\w\-\.]+\.\w{2,}(\/.*)?$/, {
    message: 'El link del web_service debe ser valido.',
  })
  @IsString({
    message: 'El link del web_service debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El link del web_service no debe estar vacio.' })
  @ValidateIf(
    (empresa) =>
      empresa.ose_enabled && typeof empresa.ose_enabled === 'boolean',
  )
  web_service: string;

  //cert_password
  @IsString({
    message: 'La contraseña del certificado debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'La contraseña del certificado no debe estar vacia.' })
  @ValidateIf((empresa) => empresa.modo === 1)
  cert_password: string;

  //modo
  @IsIn([0, 1], { message: 'El modo de la empresa debe ser 0 o 1.' })
  @IsInt({
    message: 'El modo de la empresa debe contener un valor entero.',
  })
  @IsNotEmpty({ message: 'El modo de la empresa no debe estar vacio.' })
  modo: number;

  @IsBoolean({
    message:
      'Para habilitar OSE a una empresa debe contener un valor afirmativo/negativo.',
  })
  @IsNotEmpty({ message: 'La habilitacion del OSE no debe ser vacio.' })
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

  //correo
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'El correo debe ser válido.',
  })
  @IsNotEmpty({ message: 'El correo no debe estar vacio.' })
  correo: string;

  //telefono_movil_1
  @Matches(/^9\d{8}$/, {
    message: 'El celular 1 debe ser válido.',
  })
  @IsNotEmpty({ message: 'El primer celular no debe estar vacio.' })
  telefono_movil_1: string;

  //telefono_movil_2
  @Matches(/^9\d{8}$/, {
    message: 'El celular 2 debe ser válido.',
  })
  @IsOptional()
  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  telefono_movil_2?: string;

  //Telefono fijo1
  @IsString({
    message: 'El telefono fijo_1 debe contener una cadena de texto.',
  })
  @IsOptional()
  telefono_fijo_1?: string;

  //Telefono fijo2
  @IsString({
    message: 'El telefono fijo_2 debe contener una cadena de texto.',
  })
  @IsOptional()
  telefono_fijo_2?: string;

  @IsNotEmpty({ message: 'Los documentos de la empresa no debe estar vacia.' })
  documentos: any[];

  @IsNotEmpty({
    message: 'Los establecimientos de la empresa no debe estar vacia.',
  })
  establecimientos: any[];

  @IsNotEmpty({
    message: 'Los puntos de venta de la empresa no debe estar vacio.',
  })
  @IsOptional()
  pos: any[];
}
