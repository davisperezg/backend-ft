import { UserDocument } from './../schemas/user.schema';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsEmpty,
  validate,
  IsDefined,
} from 'class-validator';
import { IsMatchPassword } from 'src/lib/decorators/match-password.decorator';
import { UserSchema } from '../schemas/user.schema';

export class UpdatePasswordDTO {
  //CONTRASENIA
  // @Matches(/((?=.*\d)(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
  //   message:
  //     'La contraseña debe contener una mayúscula, números y caracter especial',
  // })
  @MaxLength(25, {
    message:
      'La contraseña del usuario debe ser igual o menor a 200 caracteres',
  })
  @MinLength(8, {
    message:
      'La confirmación de contraseña del usuario debe tener minimo 8 caracteres',
  })
  @ValidateIf((_, value) => value !== '')
  @IsOptional()
  password?: string;

  //CONFIRMAR PASSWORD
  @MaxLength(25, {
    message:
      'La confirmación de contraseña del usuario debe ser igual o menor a 200 caracteres',
  })
  @MinLength(8, {
    message:
      'La confirmación de contraseña del usuario debe tener minimo 8 caracteres',
  })
  @IsMatchPassword('password', {
    message:
      'La confirmación de contraseña no coincide con la contraseña ingresada',
  })
  @ValidateIf((object) => object.password !== '')
  @IsOptional()
  confirm_password?: string;
}
