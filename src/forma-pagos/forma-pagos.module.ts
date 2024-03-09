import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormaPagosEntity } from './entities/forma-pagos.entity';
import { FormaPagosService } from './services/forma-pagos.service';
import { FormaPagosController } from './controllers/forma-pagos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FormaPagosEntity])],
  providers: [FormaPagosService],
  controllers: [FormaPagosController],
  exports: [FormaPagosService],
})
export class FormaPagosModule {}
