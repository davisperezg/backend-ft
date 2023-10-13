import { Module } from '@nestjs/common';
import { EntidadesService } from './services/entidades.service';
import { EntidadesController } from './controllers/entidades.controller';
import { DepartamentoEntity } from './entities/departamento.entity';
import { ProvinciaEntity } from './entities/provincia.entity';
import { DistritoEntity } from './entities/distrito.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DepartamentoEntity,
      ProvinciaEntity,
      DistritoEntity,
    ]),
  ],
  providers: [EntidadesService],
  controllers: [EntidadesController],
})
export class EntidadesModule {}
