import { Module, forwardRef } from '@nestjs/common';
import { SunatService } from './services/sunat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { UnidadesService } from 'src/unidades/services/unidades.service';
import { IgvsModule } from 'src/igvs/igvs.module';
import { UnidadesModule } from 'src/unidades/unidades.module';
import { UnidadEntity } from 'src/unidades/entities/unidades.entity';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { GatewayModule } from 'src/gateway/gateway.module';
import { SocketSessionModule } from 'src/socket-session/socket-session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity, UnidadEntity, AnulacionEntity]),
    IgvsModule,
    UnidadesModule,
    forwardRef(() => InvoiceModule),
    EstablecimientoModule,
    EmpresaModule,
    forwardRef(() => GatewayModule),
    SocketSessionModule,
  ],
  providers: [SunatService, UnidadesService],
  exports: [SunatService],
})
export class SunatModule {}
