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
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
    ]),
    forwardRef(() => SeriesModule),
    forwardRef(() => EmpresaModule),
    TipodocsModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    RoleService,
    ModuleService,
    MenuService,
    ServicesUsersService,
    EmpresaService,
    EstablecimientoService,
    PosService,
  ],
  exports: [UserService],
})
export class UserModule {}
