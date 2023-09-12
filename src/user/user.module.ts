import { UserEntity } from './entities/user.entity';
import {
  Services_User,
  ServicesUserSchema,
} from './../services-users/schemas/services-user';
import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from 'src/role/services/role.service';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import {
  Resource_RoleSchema,
  Resource_Role,
} from 'src/resources-roles/schemas/resources-role';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';
import { ModuleService } from 'src/module/services/module.service';
import {
  ModuleSchema,
  Module as ModuleEntity,
} from 'src/module/schemas/module.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EmpresaEntity]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
    ]),
    forwardRef(() => EmpresaModule),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    RoleService,
    ModuleService,
    MenuService,
    ServicesUsersService,
    EmpresaService,
  ],
  exports: [UserService],
})
export class UserModule {}
