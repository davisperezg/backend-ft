import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PosEntity } from '../entities/pos.entity';
import { Repository } from 'typeorm';
import { CreatePosDto } from '../dto/create-pos.dto';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PosEntity)
    private readonly posRepository: Repository<PosEntity>,
    private readonly establecimientoService: EstablecimientoService,
  ) {}

  async createPOS(data: CreatePosDto) {
    const establecimiento =
      await this.establecimientoService.findEstablecimientoById(
        data.establecimiento,
      );

    const createObj = this.posRepository.create({
      codigo: data.codigo,
      nombre: data.nombre,
      establecimiento,
    });

    try {
      return await this.posRepository.save(createObj);
    } catch (e) {
      throw new Error('Error al intentar crear punto de venta');
    }
  }
}
