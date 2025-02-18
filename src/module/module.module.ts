import {
  CopyServices_User,
  CopyServicesSchema,
} from './../services-users/schemas/cp-services-user';
import { ModuleController } from './controllers/module.controller';
import { ModuleService } from './services/module.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ModuleSchema, Module as ModuleEntity } from './schemas/module.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import { RoleService } from 'src/role/services/role.service';
import { RoleSchema, Role } from 'src/role/schemas/role.schema';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';
import { SeriesModule } from 'src/series/series.module';
import { PosService } from 'src/pos/services/pos.service';
import { PosEntity } from 'src/pos/entities/pos.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EmpresaEntity,
      TipodocsEmpresaEntity,
      EstablecimientoEntity,
      UsersEmpresaEntity,
      PosEntity,
    ]),
    MongooseModule.forFeature([
      { name: ModuleEntity.name, schema: ModuleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: User.name, schema: UserSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
    ]),
    TipodocsModule,
    SeriesModule,
  ],
  controllers: [ModuleController],
  providers: [
    ModuleService,
    MenuService,
    ServicesUsersService,
    UserService,
    RoleService,
    EmpresaService,
    EstablecimientoService,
    PosService,
  ],
})
export class ModuleModule {}
