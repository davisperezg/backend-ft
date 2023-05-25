import { IsString, IsNotEmpty, ArrayMinSize, IsArray } from 'class-validator';

export class CreateServicesDTO {
  //RESOUCES
  @IsString({
    each: true,
    message: 'Los modulos del usuario no contiene un id correcto',
  })
  @ArrayMinSize(1, {
    message: 'El usuario debe contener minimo 1 modulo o servicio',
  })
  @IsArray({ message: 'El modulo o servicio del usuario debe ser un array' })
  @IsNotEmpty({ message: 'Por favor, ingrese los modulos o servicios' })
  modules: string[];

  //USER
  @IsString({
    message: 'El usuario debe contener un id válido',
  })
  @IsNotEmpty({
    message: 'Por favor, asigne los modulos o servicios a un usuario',
  })
  user: string;
}
