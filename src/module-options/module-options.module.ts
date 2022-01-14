import { Module } from '@nestjs/common';
import { ModuleOptionsController } from './controllers/module-options.controller';
import { ModuleOptionsService } from './services/module-options.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ModuleOptionsSchema } from './schemas/module-options.schema';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { OptionSchema } from 'src/option/schemas/option.schema';
import { OptionService } from 'src/option/services/option.service';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { RoleService } from 'src/role/services/role.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ModuleOptions', schema: ModuleOptionsSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: 'Option', schema: OptionSchema },
      { name: 'Role', schema: RoleSchema },
    ]),
  ],
  controllers: [ModuleOptionsController],
  providers: [
    ModuleOptionsService,
    ModuleService,
    MenuService,
    OptionService,
    RoleService,
  ],
})
export class ModuleOptionsModule {}
