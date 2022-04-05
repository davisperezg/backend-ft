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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: User.name, schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: 'Resource', schema: ResourceSchema },
    ]),
  ],
  controllers: [ModuleController],
  providers: [
    ModuleService,
    MenuService,
    UserService,
    RoleService,
    ResourcesRolesService,
    ResourceService,
  ],
})
export class ModuleModule {}
