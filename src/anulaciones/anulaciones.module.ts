import { Module } from '@nestjs/common';
import { AnulacionEntity } from './entities/anulacion.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AnulacionEntity])],
})
export class AnulacionesModule {}
