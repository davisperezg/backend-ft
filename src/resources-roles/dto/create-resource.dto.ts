import { IsString, IsNotEmpty, ArrayMinSize, IsArray } from 'class-validator';

export class CreateResourcesRolDTO {
  //RESOUCES
  @IsString({
    each: true,
    message: 'Los recursos del rol no contiene un id correcto',
  })
  @ArrayMinSize(1, { message: 'El rol debe contener minimo 1 recurso' })
  @IsArray({ message: 'El recurso del rol debe ser un array' })
  @IsNotEmpty({ message: 'Por favor, ingrese recursos' })
  resources: string[];

  //USER
  @IsString({
    message: 'El rol debe contener un id válido',
  })
  @IsNotEmpty({ message: 'Por favor, asigne los permisos a un rol' })
  role: string;
}
