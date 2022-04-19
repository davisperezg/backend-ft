import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CtxUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = {
      findUser: {
        _id: request.user.findUser._id,
        name: request.user.findUser.name,
        lastname: request.user.findUser.lastname,
        fullname:
          request.user.findUser.name + ' ' + request.user.findUser.lastname,
        email: request.user.findUser.email,
        status: request.user.findUser.status,
        role: {
          modules: request.user.findUser.role.module,
          name: request.user.findUser.role.name,
        },
      },
    };
    return user;
  },
);
