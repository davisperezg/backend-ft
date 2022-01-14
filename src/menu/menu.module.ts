import { Module } from '@nestjs/common';
import { MenuService } from './services/menu.service';
import { MenuController } from './controllers/menu.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Menu, MenuSchema } from './schemas/menu.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Menu.name, schema: MenuSchema }]),
  ],
  providers: [MenuService],
  controllers: [MenuController],
})
export class MenuModule {}
