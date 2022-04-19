import { CanActivate, ExecutionContext, Type, mixin } from '@nestjs/common';
import Permission from '../type/permission.type';
import { JwtAuthGuard } from './auth.guard';

const PermissionGuard = (permission: Permission): Type<CanActivate> => {
  class PermissionGuardMixin extends JwtAuthGuard {
    async canActivate(context: ExecutionContext) {
      await super.canActivate(context);

      const request = context.switchToHttp().getRequest<any>();
      const user = request.user.findResource;
      return user.includes(permission);
    }
  }

  return mixin(PermissionGuardMixin);
};

export default PermissionGuard;
