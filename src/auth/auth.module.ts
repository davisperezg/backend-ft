import {
  Resource_RoleSchema,
  Resource_Role,
} from './../resources-roles/schemas/resources-role';
import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from 'src/user/services/user.service';
import { UserSchema } from 'src/user/schemas/user.schema';
import { jwtConstants } from 'src/lib/const/consts';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/lib/strategies/jwt.strategies';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { RoleService } from 'src/role/services/role.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30m' },
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: 'Resource', schema: ResourceSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    ResourcesRolesService,
    AuthService,
    UserService,
    JwtStrategy,
    RoleService,
    ModuleService,
    MenuService,
    ResourceService,
  ],
})
export class AuthModule {}
