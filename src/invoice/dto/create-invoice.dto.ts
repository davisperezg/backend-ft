import { IsNotEmpty, IsString } from 'class-validator';

export class CreateInvoiceDto {
  //XML
  @IsString({
    message: 'La ruta del xml debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor complete la ruta del xml' })
  xml: string;

  @IsString({
    message: 'El nombre del archivo debe contener una cadena de texto',
  })
  @IsNotEmpty({ message: 'Por favor complete el nombre del archivo' })
  fileName: string;
}
