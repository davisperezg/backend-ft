import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadEntity } from './entities/unidades.entity';
import { UnidadesService } from './services/unidades.service';
import { UnidadesController } from './controllers/unidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UnidadEntity])],
  providers: [UnidadesService],
  controllers: [UnidadesController],
  exports: [UnidadesService],
})
export class UnidadesModule {}
