import { Module } from '@nestjs/common';
import { ConfigEmpresaEntity } from './entities/configuraciones_empresa.entity';
import { ConfigEstablecimientoEntity } from './entities/configuraciones_establecimiento.entity';
import { ConfiguracionesServices } from './services/configuraciones.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigUsuarioEntity } from './entities/configuraciones_usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfigEmpresaEntity,
      ConfigEstablecimientoEntity,
      ConfigUsuarioEntity,
    ]),
  ],
  providers: [ConfiguracionesServices],
  exports: [ConfiguracionesServices],
})
export class ConfiguracionesModule {}
