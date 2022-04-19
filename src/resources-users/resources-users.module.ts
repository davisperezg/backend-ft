import { Module } from '@nestjs/common';
import { ResourcesUsersService } from './services/resources-users.service';
import { ResourcesUsersController } from './controllers/resources-users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource_UserSchema, Resource_User } from './schemas/resources-user';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { Resource, ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import {
  Module as ModuleE,
  ModuleSchema,
} from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from './schemas/cp-resource-user';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: ModuleE.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: User.name, schema: UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
    ]),
  ],
  providers: [
    ResourcesUsersService,
    ResourceService,
    RoleService,
    ModuleService,
    MenuService,
    UserService,
    ResourcesRolesService,
  ],
  controllers: [ResourcesUsersController],
})
export class ResourcesUsersModule {}
