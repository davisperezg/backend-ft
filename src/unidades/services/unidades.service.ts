import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UnidadEntity } from '../entities/unidades.entity';
import { Repository } from 'typeorm';
import { UNIDADES } from 'src/lib/const/consts';

@Injectable()
export class UnidadesService implements OnModuleInit {
  constructor(
    @InjectRepository(UnidadEntity)
    private unidadRepository: Repository<UnidadEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.unidadRepository.count();

    if (count > 0) return;

    const unidades = this.unidadRepository.create(UNIDADES);
    await this.unidadRepository.insert(unidades);
  }

  async findUnidadById(id: number) {
    try {
      return await this.unidadRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener unidad de medida UnidadService.findUnidadById',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findUnidadByCodigo(codigo: string) {
    try {
      return await this.unidadRepository.findOne({
        where: {
          codigo,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener unidad de medida UnidadService.findUnidadByCodigo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listUnidades() {
    return await this.unidadRepository.find();
  }
}
