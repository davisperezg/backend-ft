import { Module, forwardRef } from '@nestjs/common';
import { PosService } from './services/pos.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosEntity } from './entities/pos.entity';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { UserService } from 'src/user/services/user.service';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserModule } from 'src/user/user.module';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
import {
  ModuleSchema,
  Module as ModuleEntity,
} from 'src/module/schemas/module.schema';
import { UserEntity } from 'src/user/entities/user.entity';
import { RoleService } from 'src/role/services/role.service';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { ModuleService } from 'src/module/services/module.service';
import { SeriesService } from 'src/series/services/series.service';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';
import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { MenuService } from 'src/menu/services/menu.service';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { TipodocsEmpresaService } from 'src/tipodocs_empresa/services/tipodocs_empresa.service';

@Module({
  imports: [
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
    TypeOrmModule.forFeature([
      UserEntity,
      PosEntity,
      EstablecimientoEntity,
      EmpresaEntity,
      TipodocsEmpresaEntity,
      UsersEmpresaEntity,
      TipodocsEntity,
      SeriesEntity,
    ]),
    forwardRef(() => UserModule),
    EstablecimientoModule,
  ],
  providers: [
    MenuService,
    PosService,
    RoleService,
    EstablecimientoService,
    EmpresaService,
    UserService,
    TipodocsService,
    ModuleService,
    SeriesService,
    ServicesUsersService,
    TipodocsEmpresaService,
  ],
})
export class PosModule {}
