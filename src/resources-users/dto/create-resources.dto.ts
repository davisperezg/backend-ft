import { IsString, IsNotEmpty, ArrayMinSize, IsArray } from 'class-validator';

export class CreateResourcesDTO {
  //RESOUCES
  @IsString({
    each: true,
    message: 'Los recursos del usuario no contiene un id correcto',
  })
  @ArrayMinSize(1, { message: 'El usuario debe contener minimo 1 recurso' })
  @IsArray({ message: 'El recurso del usuario debe ser un array' })
  @IsNotEmpty({ message: 'Por favor, ingrese recursos' })
  resources: string[];

  //USER
  @IsString({
    message: 'El usuario debe contener un id válido',
  })
  @IsNotEmpty({ message: 'Por favor, asigne los permisos a un usuario' })
  user: string;
}
