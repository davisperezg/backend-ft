import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TIPOS_IGVS } from 'src/lib/const/consts';
import { IGVEntity } from '../entities/igvs.entity';

@Injectable()
export class IgvsService implements OnModuleInit {
  constructor(
    @InjectRepository(IGVEntity)
    private igvRepository: Repository<IGVEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.igvRepository.count();

    if (count > 0) return;

    const igvs = this.igvRepository.create(TIPOS_IGVS);
    await this.igvRepository.insert(igvs);
  }

  async findTipIgvById(id: number) {
    try {
      return await this.igvRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener tipo igv IgvService.findTipIgvById',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findTipIgvByCodigo(codigo: string) {
    try {
      return await this.igvRepository.findOne({
        where: {
          codigo,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener tipo igv IgvService.findTipIgvByCodigo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listIgvs() {
    return await this.igvRepository.find();
  }
}
