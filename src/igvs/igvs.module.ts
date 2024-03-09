import { Module } from '@nestjs/common';
import { IGVEntity } from './entities/igvs.entity';
import { IgvsService } from './services/igvs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IgvsController } from './controllers/igvs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IGVEntity])],
  providers: [IgvsService],
  controllers: [IgvsController],
  exports: [IgvsService],
})
export class IgvsModule {}
