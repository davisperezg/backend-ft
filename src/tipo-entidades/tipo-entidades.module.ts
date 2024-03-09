import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoEntidadEntity } from './entities/tipo-entidades.entity';
import { TipoEntidadService } from './services/tipo-entidades.service';
import { TipoEntidadController } from './controllers/tipo-entidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipoEntidadEntity])],
  providers: [TipoEntidadService],
  controllers: [TipoEntidadController],
  exports: [TipoEntidadService],
})
export class TipoEntidadesModule {}
