import { Module, forwardRef } from '@nestjs/common';
import { EmpresaService } from './services/empresa.service';
import { EmpresaController } from './controllers/empresa.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaEntity } from './entities/empresa.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpresaEntity]),
    forwardRef(() => UserModule),
  ],
  providers: [EmpresaService],
  controllers: [EmpresaController],
  exports: [EmpresaService],
})
export class EmpresaModule {}
