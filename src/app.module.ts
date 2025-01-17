import {
  ServicesUserSchema,
  Services_User,
} from './services-users/schemas/services-user';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MenuModule } from './menu/menu.module';
import { ModuleModule } from './module/module.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { ResourceModule } from './resource/resource.module';
import { AuthModule } from './auth/auth.module';
import { ResourcesRolesModule } from './resources-roles/resources-roles.module';
import { ResourcesUsersModule } from './resources-users/resources-users.module';
import { ServicesUsersModule } from './services-users/services-users.module';
import { ConfigModule } from '@nestjs/config';
import { GroupsResourceModule } from './groups-resources/groups-resources.module';
import {
  Groupsresources,
  GroupsresourcesSchema,
} from './groups-resources/schemas/groups-resources.schema';
import { APP_FILTER } from '@nestjs/core';
import { ValidationErrorFilter } from './lib/class-validator/validation-error.filter';
import { Resource, ResourceSchema } from './resource/schemas/resource.schema';
import {
  Resource_User,
  Resource_UserSchema,
} from './resources-users/schemas/resources-user';
import { Role, RoleSchema } from './role/schemas/role.schema';
import { User, UserSchema } from './user/schemas/user.schema';
import { Menu, MenuSchema } from './menu/schemas/menu.schema';
import {
  Module as ModuleE,
  ModuleSchema,
} from './module/schemas/module.schema';
import {
  Resource_Role,
  Resource_RoleSchema,
} from './resources-roles/schemas/resources-role';
import { InvoiceModule } from './invoice/invoice.module';

import { EstablecimientoModule } from './establecimiento/establecimiento.module';
import { TipodocsModule } from './tipodocs/tipodocs.module';
import { SeriesModule } from './series/series.module';
import { TipodocsEntity } from './tipodocs/entities/tipodocs.entity';
import { TipodocsEmpresaModule } from './tipodocs_empresa/tipodocs_empresa.module';
import { EmpresaModule } from './empresa/empresa.module';
import { EntidadesModule } from './entidades/entidades.module';
import { UsersEmpresaModule } from './users_empresa/users_empresa.module';
import { UnidadesModule } from './unidades/unidades.module';
import { IgvsModule } from './igvs/igvs.module';
import { MonedasModule } from './monedas/monedas.module';
import { FormaPagosModule } from './forma-pagos/forma-pagos.module';
import { TipoEntidadesModule } from './tipo-entidades/tipo-entidades.module';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { ConnectionModule } from './connection/connection.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';
import { AnulacionesModule } from './anulaciones/anulaciones.module';
import { CodesReturnSunatModule } from './codes-return-sunat/codes-return-sunat.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const uploadsPath = join(__dirname, '..', 'uploads/files'); // La ruta física de la carpeta que contiene tus archivos
        return [
          {
            rootPath: uploadsPath,
            serveRoot: '/files', // La ruta desde la cual los archivos serán servidos
            serveStaticOptions: {
              index: false,
              fallthrough: false,
              extensions: ['pdf', 'xml', 'zip'],
              setHeaders: (res, path) => {
                if (path.endsWith('.xml')) {
                  res.setHeader('Content-Type', 'application/xml');
                  res.setHeader('Content-Disposition', 'attachment');
                } else if (path.endsWith('.zip')) {
                  res.setHeader('Content-Type', 'application/zip');
                  res.setHeader('Content-Disposition', 'attachment');
                } else {
                  res.setHeader('Content-Type', 'application/pdf');
                  res.setHeader('Content-Disposition', 'inline');
                }
              },
            },
          },
        ];
      },
    }),
    TypeOrmModule.forFeature([TipodocsEntity]),
    MongooseModule.forFeature([
      { name: Groupsresources.name, schema: GroupsresourcesSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Menu.name, schema: MenuSchema },
      { name: ModuleE.name, schema: ModuleSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
    ]),
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
      isGlobal: true,
      cache: true,
    }),
    MongooseModule.forRoot(process.env.URL_DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryAttempts: 2,
    }),
    TypeOrmModule.forRoot({
      type: process.env.MYSQL,
      host: process.env.MYSQL_URL,
      port: process.env.MYSQL_PORT,
      username: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development' ? true : false,
    } as any),
    UserModule,
    RoleModule,
    ResourceModule,
    MenuModule,
    ModuleModule,
    AuthModule,
    ResourcesRolesModule,
    ResourcesUsersModule,
    ServicesUsersModule,
    GroupsResourceModule,
    InvoiceModule,
    EstablecimientoModule,
    TipodocsModule,
    SeriesModule,
    TipodocsEmpresaModule,
    EmpresaModule,
    EntidadesModule,
    UsersEmpresaModule,
    UnidadesModule,
    IgvsModule,
    MonedasModule,
    FormaPagosModule,
    TipoEntidadesModule,
    ConfiguracionesModule,
    ConnectionModule,
    AnulacionesModule,
    CodesReturnSunatModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ValidationErrorFilter,
    },
  ],
})
export class AppModule {}
