import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from 'src/resources-users/schemas/cp-resource-user';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import { ResourcesUsersService } from 'src/resources-users/services/resources-users.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { RoleController } from './controllers/role.controller';
import { RoleSchema } from './schemas/role.schema';
import { RoleService } from './services/role.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Role', schema: RoleSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Resource', schema: ResourceSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
    ]),
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    ModuleService,
    ResourceService,
    MenuService,
    ResourcesRolesService,
    UserService,
    ResourcesUsersService,
  ],
})
export class RoleModule {}
