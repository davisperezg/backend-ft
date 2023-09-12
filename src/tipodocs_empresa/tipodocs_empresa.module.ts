import { Module } from '@nestjs/common';
import { TipodocsEmpresaController } from './controllers/tipodocs_empresa.controller';
import { TipodocsEmpresaService } from './services/tipodocs_empresa.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipodocsEmpresaEntity } from './entities/tipodocs_empresa.entity';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { SeriesModule } from 'src/series/series.module';
import { EmpresaModule } from 'src/empresa/empresa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipodocsEmpresaEntity]),
    TipodocsModule,
    EmpresaModule,
  ],
  controllers: [TipodocsEmpresaController],
  providers: [TipodocsEmpresaService],
})
export class TipodocsEmpresaModule {}
