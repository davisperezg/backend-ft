import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionWS } from './entities/connection_ws.entity';
import { ConnectionService } from './services/connection.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectionWS])],
  providers: [ConnectionService],
  exports: [ConnectionService],
})
export class ConnectionModule {}
