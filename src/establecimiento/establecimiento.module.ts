import { Module } from '@nestjs/common';
import { EstablecimientoService } from './services/establecimiento.service';
import { EstablecimientoController } from './controllers/establecimiento.controller';

@Module({
  providers: [EstablecimientoService],
  controllers: [EstablecimientoController]
})
export class EstablecimientoModule {}
