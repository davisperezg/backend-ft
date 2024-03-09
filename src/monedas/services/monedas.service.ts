import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MONEDAS } from 'src/lib/const/consts';
import { MonedaEntity } from '../entities/monedas.entity';

@Injectable()
export class MonedasService implements OnModuleInit {
  constructor(
    @InjectRepository(MonedaEntity)
    private monedaRepository: Repository<MonedaEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.monedaRepository.count();

    if (count > 0) return;

    const unidades = this.monedaRepository.create(MONEDAS);
    await this.monedaRepository.insert(unidades);
  }

  async findMonedaById(id: number) {
    try {
      return await this.monedaRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener moneda.findMonedaById',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOneMonedaByAbrstandar(abrstandar: string) {
    try {
      return await this.monedaRepository.findOne({
        where: {
          abrstandar: abrstandar,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener moneda.findOneMonedaByAbrstandar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listMonedas() {
    return await this.monedaRepository.find();
  }
}
