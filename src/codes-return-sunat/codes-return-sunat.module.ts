import { Module } from '@nestjs/common';
import { CodesReturnSunatService } from './services/codes-return-sunat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodesReturnSunatEntity } from './entities/codes-return-sunat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CodesReturnSunatEntity])],
  providers: [CodesReturnSunatService],
  exports: [CodesReturnSunatService],
})
export class CodesReturnSunatModule {}
