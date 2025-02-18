import { PosService } from './../pos/services/pos.service';
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
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { PosEntity } from 'src/pos/entities/pos.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TypeOrmModule.forFeature([
      EmpresaEntity,
      TipodocsEmpresaEntity,
      EstablecimientoEntity,
      PosEntity,
    ]),
    forwardRef(() => UserModule),
    TipodocsModule,
    EstablecimientoModule,
  ],
  providers: [EmpresaService, PosService],
  controllers: [EmpresaController],
  exports: [EmpresaService],
})
export class EmpresaModule {}
