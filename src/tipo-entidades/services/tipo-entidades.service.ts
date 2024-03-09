import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoEntidadEntity } from '../entities/tipo-entidades.entity';
import { TIPO_ENTIDADES } from 'src/lib/const/consts';

@Injectable()
export class TipoEntidadService implements OnModuleInit {
  constructor(
    @InjectRepository(TipoEntidadEntity)
    private tipoEntidadRepository: Repository<TipoEntidadEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.tipoEntidadRepository.count();

    if (count > 0) return;

    const igvs = this.tipoEntidadRepository.create(TIPO_ENTIDADES);
    await this.tipoEntidadRepository.insert(igvs);
  }

  async listTipoEntidades() {
    return await this.tipoEntidadRepository.find();
  }

  async findTipoEntidadById(id: number) {
    try {
      return await this.tipoEntidadRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener el tipo de entidad',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findTipoEntidadByTipo(tipo_entidad: string) {
    return await this.tipoEntidadRepository.findOne({
      where: {
        tipo_entidad,
      },
    });
  }

  async findTipoEntidadByCodigo(codigo: string) {
    return await this.tipoEntidadRepository.findOne({
      where: {
        codigo,
      },
    });
  }
}
