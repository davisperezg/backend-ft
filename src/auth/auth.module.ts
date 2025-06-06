import {
  Resource_RoleSchema,
  Resource_Role,
} from './../resources-roles/schemas/resources-role';
import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from 'src/user/services/user.service';
import { UserSchema } from 'src/user/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/lib/strategies/jwt.strategies';
import { RoleSchema } from 'src/role/schemas/role.schema';
import { RoleService } from 'src/role/services/role.service';
import { ModuleSchema } from 'src/module/schemas/module.schema';
import { ModuleService } from 'src/module/services/module.service';
import { MenuSchema } from 'src/menu/schemas/menu.schema';
import { MenuService } from 'src/menu/services/menu.service';
import { ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import { ResourcesUsersService } from 'src/resources-users/services/resources-users.service';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from 'src/resources-users/schemas/cp-resource-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_SECRET_KEY'),
          signOptions: {
            expiresIn: config.get<string | number>('JWT_EXPIRE'),
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Role', schema: RoleSchema },
      { name: 'Module', schema: ModuleSchema },
      { name: 'Menu', schema: MenuSchema },
      { name: 'Resource', schema: ResourceSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
    ]),
    TipodocsModule,
    SeriesModule,
  ],
  controllers: [AuthController],
  providers: [
    ResourcesRolesService,
    ResourcesUsersService,
    AuthService,
    UserService,
    JwtStrategy,
    RoleService,
    ModuleService,
    MenuService,
    ResourceService,
    ServicesUsersService,
    EmpresaService,
    EstablecimientoService,
    PosService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
