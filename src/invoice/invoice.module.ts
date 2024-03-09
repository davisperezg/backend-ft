import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { ConfigService, ConfigModule } from '@nestjs/config';
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
import { InvoiceGateway } from './gateway/invoice.gateway';
import { ConnectionModule } from 'src/connection/connection.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/lib/strategies/jwt.strategies';
import { AuthModule } from 'src/auth/auth.module';
import { ResourcesUsersModule } from 'src/resources-users/resources-users.module';
import { InvoiceDetailsEntity } from './entities/invoice_details.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      EntidadEntity,
      UserEntity,
      SeriesEntity,
      InvoiceDetailsEntity,
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
    AuthModule,
    ResourcesUsersModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceGateway, JwtStrategy],
  exports: [InvoiceService],
})
export class InvoiceModule {}
