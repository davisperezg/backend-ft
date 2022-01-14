import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MenuModule } from './menu/menu.module';
import { ModuleModule } from './module/module.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { OptionModule } from './option/option.module';
import { ModuleOptionsModule } from './module-options/module-options.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/sisvilla', {
      useFindAndModify: false,
      useCreateIndex: true,
    }),
    MenuModule,
    ModuleModule,
    UserModule,
    RoleModule,
    OptionModule,
    ModuleOptionsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
