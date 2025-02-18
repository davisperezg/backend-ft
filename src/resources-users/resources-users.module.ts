import { Module } from '@nestjs/common';
import { ResourcesUsersService } from './services/resources-users.service';
import { ResourcesUsersController } from './controllers/resources-users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource_UserSchema, Resource_User } from './schemas/resources-user';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { Resource, ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from './schemas/cp-resource-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
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
import { Menu, MenuSchema } from 'src/menu/schemas/menu.schema';
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
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
      { name: Menu.name, schema: MenuSchema },
    ]),
    TipodocsModule,
    SeriesModule,
  ],
  providers: [
    ResourcesUsersService,
    ResourceService,
    RoleService,
    UserService,
    ModuleService,
    MenuService,
    ServicesUsersService,
    EmpresaService,
    EstablecimientoService,
    PosService,
  ],
  controllers: [ResourcesUsersController],
  exports: [ResourcesUsersService],
})
export class ResourcesUsersModule {}
