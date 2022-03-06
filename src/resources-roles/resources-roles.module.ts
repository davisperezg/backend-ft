import { Module } from '@nestjs/common';
import { ResourcesRolesService } from './services/resources-roles.service';
import { ResourcesRolesController } from './controllers/resources-roles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource_Role, Resource_RoleSchema } from './schemas/resources-role';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: ModuleE.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
    ]),
  ],
  providers: [
    ResourcesRolesService,
    ResourceService,
    RoleService,
    ModuleService,
    MenuService,
  ],
  controllers: [ResourcesRolesController],
})
export class ResourcesRolesModule {}
