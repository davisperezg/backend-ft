import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigEmpresaEntity } from '../entities/configuraciones_empresa.entity';
import { ConfigEstablecimientoEntity } from '../entities/configuraciones_establecimiento.entity';
import { Repository } from 'typeorm';
import { ConfigUsuarioEntity } from '../entities/configuraciones_usuario.entity';
@Injectable()
export class ConfiguracionesServices {
  constructor(
    @InjectRepository(ConfigEmpresaEntity)
    private cfgEmpresaRepository: Repository<ConfigEmpresaEntity>,
    @InjectRepository(ConfigEstablecimientoEntity)
    private cfgEstablecimientoRepository: Repository<ConfigEstablecimientoEntity>,
    @InjectRepository(ConfigUsuarioEntity)
    private cfgUsuarioRepository: Repository<ConfigUsuarioEntity>,
  ) {}

  async getConfigEstablecimiento(idEstablecimiento: number) {
    try {
      return await this.cfgEstablecimientoRepository.findOne({
        where: {
          establecimiento: {
            id: idEstablecimiento,
          },
        },
      });
    } catch (error) {
      throw new HttpException(
        `Error al obtener la configuración del establecimiento`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getConfigEmpresa(idEmpresa: number) {
    try {
      return await this.cfgEmpresaRepository.findOne({
        where: {
          empresa: {
            id: idEmpresa,
          },
        },
      });
    } catch (error) {
      throw new HttpException(
        `Error al obtener la configuración de la empresa`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getConfigUsuario(idUsuario: number) {
    try {
      return await this.cfgUsuarioRepository.findOne({
        where: {
          id: idUsuario,
        },
      });
    } catch (error) {
      throw new HttpException(
        `Error al obtener la configuración del usuario`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
