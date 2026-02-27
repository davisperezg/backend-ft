import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class NotaVentaInput {
  @IsInt({
    message: 'El documento debe contener un valor entero y válido.',
  })
  @IsOptional()
  id?: number;

  //boleta, factura, etc... - para facturas 01
  @Length(2, 2, {
    message: 'El tipo de documento debe tener exactamente dos caracteres.',
  })
  @IsString({
    message: 'El tipo de documento debe ser una cadena de caracteres.',
  })
  @IsNotEmpty({
    message: 'Por favor complete el tipo de documento.',
  })
  tipoDocumento: string;

  @MaxLength(4, { message: 'La serie debe contener 4 dígitos.' })
  @MinLength(4, { message: 'La serie debe contener 4 dígitos.' })
  @IsString({
    message: 'La serie debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la serie de la venta.' })
  serie: string;

  @MaxLength(8, { message: 'El correlativo debe contener máximo 8 dígitos.' })
  @MinLength(1, { message: 'El correlativo debe contener mínimo 1 dígito.' })
  @IsString({
    message: 'El correlativo debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete el correlativo de la venta.' })
  numero: string;

  @IsNotEmpty({
    message: 'Por favor complete la fecha de emision de la venta.',
  })
  fechaEmision: Date;

  @IsString({
    message: 'La moneda debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la moneda de la venta.' })
  moneda: string;

  @IsInt({
    message: 'La empresa debe contener un valor entero y válido.',
  })
  @IsNotEmpty({ message: 'Por favor ingrese la empresa emisora.' })
  empresa: number;

  @IsInt({
    message:
      'El establecimiento de la empresa debe contener un valor entero y válido.',
  })
  @IsNotEmpty({
    message: 'Por favor ingrese establecimiento de la empresa emisora.',
  })
  establecimiento: number;

  @IsInt({
    message:
      'El POS del establecimiento debe contener un valor entero y válido.',
  })
  @IsNotEmpty({
    message: 'Por favor ingrese POS del establecimiento emisor.',
  })
  pos: number;

  @IsString({
    message: 'El tipo de entidad debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'Por favor complete el tipo de entidad del cliente.',
  })
  tipoEntidad: string;

  @MaxLength(11, {
    message: 'El número de documento debe contener 11 dígitos.',
  })
  @MinLength(8, {
    message: 'El número de documento debe contener mínimo 8 dígitos.',
  })
  @IsString({
    message: 'El número de documento debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'Por favor complete el número de documento del cliente.',
  })
  numeroDocumento: string;

  @IsString({
    message: 'El nombre del cliente debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete nombre completo del cliente.' })
  nombreCliente: string;

  @IsNotEmpty({ message: 'Por favor ingrese los productos de la venta.' })
  detalles: any[];

  @IsOptional()
  observaciones?: string[];
}
