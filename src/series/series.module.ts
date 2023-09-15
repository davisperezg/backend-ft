import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesEntity } from './entities/series.entity';
import { SeriesService } from './services/series.service';
import { SeriesController } from './controllers/series.controller';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { TipodocsEmpresaModule } from 'src/tipodocs_empresa/tipodocs_empresa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeriesEntity]),
    TipodocsModule,
    TipodocsEmpresaModule,
  ],
  providers: [SeriesService],
  controllers: [SeriesController],
  //exports: [SeriesService],
})
export class SeriesModule {}
