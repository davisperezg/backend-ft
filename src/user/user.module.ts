import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserSchema } from './schemas/user.schema';
import { UserService } from './services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from 'src/role/services/role.service';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { ModuleOptionsSchema } from 'src/module-options/schemas/module-options.schema';
import { ModuleOptionsService } from 'src/module-options/services/module-options.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { OptionSchema } from 'src/option/schemas/option.schema';
import { OptionService } from 'src/option/services/option.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: 'ModuleOptions', schema: ModuleOptionsSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Option', schema: OptionSchema },
      { name: 'Menu', schema: MenuSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    RoleService,
    ModuleOptionsService,
    ModuleService,
    OptionService,
    MenuService,
  ],
})
export class UserModule {}
