import { Module } from '@nestjs/common';
import { ResourceController } from './controllers/resource.controller';
import { ResourceService } from './services/resource.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource, ResourceSchema } from './schemas/resource.schema';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
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
      { name: Resource.name, schema: ResourceSchema },
      { name: Role.name, schema: RoleSchema },
      { name: ModuleE.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
    ]),
  ],
  controllers: [ResourceController],
  providers: [ResourceService, RoleService, ModuleService, MenuService],
})
export class ResourceModule {}
