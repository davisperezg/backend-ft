import { BullBoardModule } from '@bull-board/nestjs';
import { Module, forwardRef } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';
import { MonedasModule } from 'src/monedas/monedas.module';
import { FormaPagosModule } from 'src/forma-pagos/forma-pagos.module';
import { TipoEntidadesModule } from 'src/tipo-entidades/tipo-entidades.module';
import { IgvsModule } from 'src/igvs/igvs.module';
import { UnidadesModule } from 'src/unidades/unidades.module';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { ConfiguracionesModule } from 'src/configuraciones/configuraciones.module';
import { ConnectionModule } from 'src/connection/connection.module';
import { InvoiceDetailsEntity } from './entities/invoice_details.entity';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { CodesReturnSunatModule } from 'src/codes-return-sunat/codes-return-sunat.module';
import { PosModule } from 'src/pos/pos.module';
import { SunatService } from 'src/sunat/services/sunat.service';
import { GatewayModule } from 'src/gateway/gateway.module';
import { InvoiceProcessor } from 'src/invoice/processors/invoice.processor';
import { BullModule } from '@nestjs/bull';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { SocketSessionModule } from 'src/socket-session/socket-session.module';
import { InvoiceManualJobs } from './jobs/invoice-manual.job';
import { InvoiceScheduledJobs } from './jobs/invoice-scheduled.job';
import { SunatScheduledProcessor } from './processors/sunat-scheduled.processor';
import { SunatManualProcessor } from './processors/sunat-manual.processor';
import { SunatInmediateProcessor } from './processors/sunat-inmediate.processor';
import { SunatPendingProcessor } from './processors/sunat-pending.processor';
import { InvoiceInmediateJobs } from './jobs/invoice-inmediate.job';
import { InvoicePendingJobs } from './jobs/invoice-pending.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      EntidadEntity,
      UserEntity,
      SeriesEntity,
      InvoiceDetailsEntity,
      AnulacionEntity,
    ]),
    EmpresaModule,
    EstablecimientoModule,
    MonedasModule,
    FormaPagosModule,
    TipoEntidadesModule,
    IgvsModule,
    UnidadesModule,
    TipodocsModule,
    ConfiguracionesModule,
    ConnectionModule,
    CodesReturnSunatModule,
    PosModule,
    forwardRef(() => GatewayModule),
    BullModule.registerQueue(
      {
        name: 'invoice-submission', // create sale and bull inmediate - scheduled
      },
      {
        name: 'job-sunat-submission-inmediate', // job inmediate
      },
      {
        name: 'job-sunat-submission-pending', // job pending
      },
      {
        name: 'job-sunat-submission-manual', // job manual
      },
      {
        name: 'job-sunat-submission-scheduled', // job scheduled
      },
    ),
    BullBoardModule.forFeature(
      {
        name: 'invoice-submission',
        adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      },
      {
        name: 'job-sunat-submission-inmediate',
        adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      },
      {
        name: 'job-sunat-submission-pending',
        adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      },
      {
        name: 'job-sunat-submission-manual',
        adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      },
      {
        name: 'job-sunat-submission-scheduled',
        adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
      },
    ),
    SocketSessionModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    SunatService,
    InvoiceProcessor,
    SunatInmediateProcessor,
    SunatManualProcessor,
    SunatScheduledProcessor,
    SunatPendingProcessor,
    InvoiceInmediateJobs,
    InvoiceManualJobs,
    InvoiceScheduledJobs,
    InvoicePendingJobs,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
