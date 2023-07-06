import { Module } from '@nestjs/common';
import { EntidadService } from './services/entidad.service';

@Module({
  providers: [EntidadService]
})
export class EntidadModule {}
