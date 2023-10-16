import { Module, forwardRef } from '@nestjs/common';
import { EstablecimientoService } from './services/establecimiento.service';
import { EstablecimientoController } from './controllers/establecimiento.controller';
import { EstablecimientoEntity } from './entities/establecimiento.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaModule } from 'src/empresa/empresa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstablecimientoEntity]),
    forwardRef(() => EmpresaModule),
  ],
  providers: [EstablecimientoService],
  controllers: [EstablecimientoController],
  exports: [EstablecimientoService],
})
export class EstablecimientoModule {}
