import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresentationEntity } from './entities/presentation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PresentationEntity])],
})
export class PresentationModule {}
