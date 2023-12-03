import { Module } from '@nestjs/common';
import { UsersEmpresaService } from './services/users_empresa.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEmpresaEntity } from './entities/users_empresa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UsersEmpresaEntity])],
  providers: [UsersEmpresaService],
})
export class UsersEmpresaModule {}
