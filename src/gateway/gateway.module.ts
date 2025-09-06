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

@Module({
  imports: [
    TypeOrmModule.forFeature([AnulacionEntity]),
    AuthModule,
    SunatModule,
    ResourcesUsersModule,
    forwardRef(() => InvoiceModule),
    SocketSessionModule,
  ],
  providers: [InvoiceGateway, JwtStrategy],
  exports: [InvoiceGateway],
})
export class GatewayModule {}
