import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FORMAS_PAGO } from 'src/lib/const/consts';
import { FormaPagosEntity } from '../entities/forma-pagos.entity';

@Injectable()
export class FormaPagosService implements OnModuleInit {
  constructor(
    @InjectRepository(FormaPagosEntity)
    private formapagosRepository: Repository<FormaPagosEntity>,
  ) {}

  async onModuleInit() {
    const count = await this.formapagosRepository.count();

    if (count > 0) return;

    const igvs = this.formapagosRepository.create(FORMAS_PAGO);
    await this.formapagosRepository.insert(igvs);
  }

  async findFormaPagoById(id: number) {
    try {
      return await this.formapagosRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la forma de pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOneFormaPagoByformaPago(formaPago: string) {
    try {
      return await this.formapagosRepository.findOne({
        where: {
          forma_pago: formaPago,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la forma de pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listFormaPagos() {
    return await this.formapagosRepository.find();
  }
}
