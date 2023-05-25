import {
  CanActivate,
  ExecutionContext,
  Type,
  mixin,
  ForbiddenException,
} from '@nestjs/common';
import Permission from '../type/permission.type';
import { JwtAuthGuard } from './auth.guard';

const PermissionGuard = (
  permission: Permission | Permission[],
): Type<CanActivate> => {
  class PermissionGuardMixin extends JwtAuthGuard {
    async canActivate(context: ExecutionContext) {
      await super.canActivate(context);

      const request = context.switchToHttp().getRequest<any>();
      const permisos_token = request.user.token_of_permisos;
      // console.log(typeof permission, permission);
      // console.log(permisos_token);
      // console.log(permisos_token.includes(permission));

      //Si el permiso es un solo valor
      if (typeof permission == 'string') {
        if (!permisos_token.includes(permission))
          throw new ForbiddenException(
            `No tienes permiso para acceder a este recurso "${permission}"`,
          );

        //Si el permiso existe con los permisos del token generamos la solicitud
        return permisos_token.includes(permission);
      } else {
        //Si recibe un array de permisos que verifique si por lo menos existe 1
        const existeMinPermiso = permission.find((a) =>
          permisos_token.includes(a),
        );

        //Si no existe ninguno manda error
        if (!existeMinPermiso)
          throw new ForbiddenException(
            'No tienes permiso para acceder a este recurso',
          );

        //Si existe 1 genera la solicitud
        return permisos_token.includes(existeMinPermiso);
      }
    }
  }

  return mixin(PermissionGuardMixin);
};

export default PermissionGuard;
