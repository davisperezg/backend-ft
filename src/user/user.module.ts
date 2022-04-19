import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserSchema } from './schemas/user.schema';
import { UserService } from './services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from 'src/role/services/role.service';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import {
  Resource_RoleSchema,
  Resource_Role,
} from 'src/resources-roles/schemas/resources-role';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import { ResourcesUsersService } from 'src/resources-users/services/resources-users.service';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from 'src/resources-users/schemas/cp-resource-user';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Resource', schema: ResourceSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    RoleService,
    ModuleService,
    ResourceService,
    MenuService,
    ResourcesRolesService,
    ResourcesUsersService,
  ],
})
export class UserModule {}
