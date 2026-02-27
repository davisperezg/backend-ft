import { EmpresaModule } from './../empresa/empresa.module';
import { forwardRef, Module } from '@nestjs/common';
import { NotaVentaService } from './services/nota-venta.service';
import { NotaVentaController } from './controllers/nota-venta.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaVentaDetailEntity } from './entities/nota-venta-detail.entity';
import { Not } from 'typeorm';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';
import { MonedasModule } from 'src/monedas/monedas.module';
import { TipoEntidadesModule } from 'src/tipo-entidades/tipo-entidades.module';
import { IgvsModule } from 'src/igvs/igvs.module';
import { UnidadesModule } from 'src/unidades/unidades.module';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { PosModule } from 'src/pos/pos.module';
import { GatewayModule } from 'src/gateway/gateway.module';
import { SocketSessionModule } from 'src/socket-session/socket-session.module';
import { NotaVentaEntity } from './entities/nota-venta.entity';
import { SunatService } from 'src/sunat/services/sunat.service';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotaVentaEntity,
      InvoiceEntity,
      EntidadEntity,
      UserEntity,
      SeriesEntity,
      NotaVentaDetailEntity,
    ]),
    EmpresaModule,
    EstablecimientoModule,
    MonedasModule,
    TipoEntidadesModule,
    IgvsModule,
    UnidadesModule,
    TipodocsModule,
    PosModule,
    forwardRef(() => GatewayModule),
    SocketSessionModule,
  ],

  providers: [NotaVentaService, SunatService],
  controllers: [NotaVentaController],
  exports: [NotaVentaService],
})
export class NotaVentaModule {}
