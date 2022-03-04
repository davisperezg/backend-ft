import { ModuleController } from './controllers/module.controller';
import { ModuleService } from './services/module.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ModuleSchema } from './schemas/module.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { RoleService } from 'src/role/services/role.service';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: 'Resource', schema: ResourceSchema },
    ]),
  ],
  controllers: [ModuleController],
  providers: [
    ModuleService,
    MenuService,
    UserService,
    RoleService,
    ResourceService,
  ],
})
export class ModuleModule {}
