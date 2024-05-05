import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInvoiceDto {
  //XML
  // @IsString({
  //   message: 'La ruta del xml debe contener una cadena de texto',
  // })
  // @IsNotEmpty({ message: 'Por favor complete la ruta del xml' })
  // xml: string;

  // @IsString({
  //   message: 'El nombre del archivo debe contener una cadena de texto',
  // })
  // @IsNotEmpty({ message: 'Por favor complete el nombre del archivo' })
  // fileName: string;

  @MaxLength(11, { message: 'El ruc debe contener 11 dígitos.' })
  @MinLength(11, { message: 'El ruc debe contener 11 dígitos.' })
  @IsString({
    message: 'El ruc debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete el ruc del cliente.' })
  ruc: string;

  @IsString({
    message: 'La razon social debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la razón social del cliente.' })
  cliente: string;

  @IsString({
    message: 'La dirección debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la dirección del cliente.' })
  direccion: string;

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
  tipo_documento: string;

  //dni, ruc, etc...
  @IsString({
    message: 'El tipo de entidad debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'Por favor complete el tipo de entidad del cliente.',
  })
  tipo_entidad: string;

  //venta interna - 0101
  @IsString({
    message: 'El tipo de operación debe contener una cadena de texto.',
  })
  @IsNotEmpty({
    message: 'Por favor complete el tipo de operación de la venta.',
  })
  tipo_operacion: string;

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
  fecha_emision: Date;

  @IsOptional()
  fecha_vencimiento?: Date;

  @IsString({
    message: 'La forma de pago debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la forma de pago de la venta.' })
  forma_pago: string;

  @IsString({
    message: 'La moneda debe contener una cadena de texto.',
  })
  @IsNotEmpty({ message: 'Por favor complete la moneda de la venta.' })
  moneda: string;

  // @IsInt({
  //   message: 'El total gravado debe contener un valor entero y válido.',
  // })
  // @IsNotEmpty({ message: 'Por favor ingrese el total gravado de la venta.' })
  // total_gravada: number;

  // @IsInt({
  //   message: 'El total IGV debe contener un valor entero y válido.',
  // })
  // @IsNotEmpty({ message: 'Por favor ingrese el total IGV de la venta.' })
  // total_igv: number;

  // @IsInt({
  //   message: 'El total a pagar debe contener un valor entero y válido.',
  // })
  // @IsNotEmpty({ message: 'Por favor ingrese el total a pagar de la venta.' })
  // total_pagar: number;

  @IsNotEmpty({ message: 'Por favor ingrese los productos de la venta.' })
  productos: any[];

  @IsOptional()
  observaciones?: any[];

  @IsBoolean({ message: 'El borrador debe ser de tipo booleano' })
  @IsOptional()
  borrador?: boolean;
}
