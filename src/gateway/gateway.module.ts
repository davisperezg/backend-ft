import { Module, forwardRef } from '@nestjs/common';
import { InvoiceGateway } from './invoice.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { JwtStrategy } from 'src/lib/strategies/jwt.strategies';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SunatModule } from 'src/sunat/sunat.module';
import { ResourcesUsersModule } from 'src/resources-users/resources-users.module';
import { SocketSessionModule } from 'src/socket-session/socket-session.module';
import { NotaVentaGateway } from './nota_venta.gateway';
import { NotaVentaModule } from 'src/nota-venta/nota-venta.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnulacionEntity]),
    AuthModule,
    SunatModule,
    ResourcesUsersModule,
    forwardRef(() => InvoiceModule),
    forwardRef(() => NotaVentaModule),
    SocketSessionModule,
  ],
  providers: [InvoiceGateway, NotaVentaGateway, JwtStrategy],
  exports: [InvoiceGateway, NotaVentaGateway],
})
export class GatewayModule {}
