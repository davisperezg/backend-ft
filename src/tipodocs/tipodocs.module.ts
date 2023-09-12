import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipodocsEntity } from './entities/tipodocs.entity';
import { TipodocsController } from './controllers/tipodocs.controller';
import { TipodocsService } from './services/tipodocs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TipodocsEntity])],
  controllers: [TipodocsController],
  providers: [TipodocsService],
  exports: [TipodocsService],
})
export class TipodocsModule {}
