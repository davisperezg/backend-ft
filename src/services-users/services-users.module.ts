import { Module } from '@nestjs/common';
import { ServicesUsersService } from './services/services-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicesUserSchema, Services_User } from './schemas/services-user';
import { ServicesUsersController } from './controllers/services-users.controller';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import {
  ModuleSchema,
  Module as ModuleEntity,
} from 'src/module/schemas/module.schema';
import { UserService } from 'src/user/services/user.service';
import { ModuleService } from 'src/module/services/module.service';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { RoleService } from 'src/role/services/role.service';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import {
  CopyServicesSchema,
  CopyServices_User,
} from './schemas/cp-services-user';
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
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: User.name, schema: UserSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
    ]),
    TipodocsModule,
    SeriesModule,
  ],
  providers: [
    ServicesUsersService,
    UserService,
    ModuleService,
    RoleService,
    MenuService,
    EmpresaService,
    EstablecimientoService,
    PosService,
  ],
  controllers: [ServicesUsersController],
})
export class ServicesUsersModule {}
