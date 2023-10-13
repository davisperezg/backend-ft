import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import {
  ModuleSchema,
  Module as ModuleEntity,
} from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { RoleController } from './controllers/role.controller';
import { Role, RoleSchema } from './schemas/role.schema';
import { RoleService } from './services/role.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EmpresaEntity,
      TipodocsEmpresaEntity,
    ]),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
    ]),
    TipodocsModule,
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    ModuleService,
    MenuService,
    ServicesUsersService,
    UserService,
    EmpresaService,
  ],
})
export class RoleModule {}
