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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Groupsresources.name, schema: GroupsresourcesSchema },
    ]),
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
      isGlobal: true,
      cache: true,
    }),
    MongooseModule.forRoot(process.env.URL_DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
