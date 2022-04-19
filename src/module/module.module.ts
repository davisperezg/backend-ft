import { ModuleController } from './controllers/module.controller';
import { ModuleService } from './services/module.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ModuleSchema } from './schemas/module.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { RoleService } from 'src/role/services/role.service';
import { RoleSchema } from 'src/role/schemas/role.schema';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import { ResourceService } from 'src/resource/services/resource.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
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
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: User.name, schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: 'Resource', schema: ResourceSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
    ]),
  ],
  controllers: [ModuleController],
  providers: [
    ModuleService,
    MenuService,
    UserService,
    RoleService,
    ResourcesRolesService,
    ResourcesUsersService,
    ResourceService,
  ],
})
export class ModuleModule {}
