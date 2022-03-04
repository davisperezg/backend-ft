import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
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
    ]),
  ],
  controllers: [RoleController],
  providers: [RoleService, ModuleService, ResourceService, MenuService],
})
export class RoleModule {}
