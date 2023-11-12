import { Module, forwardRef, MiddlewareConsumer } from '@nestjs/common';
import { EmpresaService } from './services/empresa.service';
import { EmpresaController } from './controllers/empresa.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaEntity } from './entities/empresa.entity';
import { UserModule } from 'src/user/user.module';
import { TipodocsModule } from 'src/tipodocs/tipodocs.module';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmpresaEntity,
      TipodocsEmpresaEntity,
      EstablecimientoEntity,
    ]),
    forwardRef(() => UserModule),
    TipodocsModule,
    EstablecimientoModule,
  ],
  providers: [EmpresaService],
  controllers: [EmpresaController],
  exports: [EmpresaService],
})
export class EmpresaModule {}