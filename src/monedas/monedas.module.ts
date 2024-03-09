import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonedaEntity } from './entities/monedas.entity';
import { MonedasService } from './services/monedas.service';
import { MonedasController } from './controllers/moneda.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MonedaEntity])],
  providers: [MonedasService],
  controllers: [MonedasController],
  exports: [MonedasService],
})
export class MonedasModule {}
