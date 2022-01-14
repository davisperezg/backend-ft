import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ModuleOptionsSchema } from 'src/module-options/schemas/module-options.schema';
import { ModuleOptionsService } from 'src/module-options/services/module-options.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { OptionSchema } from 'src/option/schemas/option.schema';
import { OptionService } from 'src/option/services/option.service';
import { RoleController } from './controllers/role.controller';
import { RoleSchema } from './schemas/role.schema';
import { RoleService } from './services/role.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Role', schema: RoleSchema },
      { name: 'ModuleOptions', schema: ModuleOptionsSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Option', schema: OptionSchema },
      { name: 'Menu', schema: MenuSchema },
    ]),
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    ModuleOptionsService,
    ModuleService,
    OptionService,
    MenuService,
  ],
})
export class RoleModule {}
