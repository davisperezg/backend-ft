import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PosEntity } from '../entities/pos.entity';
import { Equal, Repository } from 'typeorm';
import { CreatePosDto } from '../dto/create-pos.dto';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { POSListDTO } from '../dto/query-pos.dto';

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

  async listPOSByIdCompany(idCompany: number): Promise<POSListDTO[]> {
    const pos = await this.posRepository.find({
      relations: {
        establecimiento: true,
      },
      where: {
        establecimiento: {
          empresa: {
            id: idCompany,
          },
        },
      },
    });

    const result: POSListDTO[] = pos.map((item) => {
      return {
        id: item.id,
        codigo: item.codigo,
        nombre: item.nombre,
        estado: item.estado,
        establecimiento: {
          id: item.establecimiento.id,
          codigo: item.establecimiento.codigo,
          denominacion: item.establecimiento.denominacion,
        },
      };
    });

    return result;
  }

  async findPOSById(idPOS: number): Promise<PosEntity> {
    let POS: PosEntity;

    try {
      POS = await this.posRepository.findOne({
        relations: {
          establecimiento: true,
        },
        where: {
          id: Equal(idPOS),
        },
      });
    } catch (error) {
      throw new Error('Error al intentar obtener POS PosService.findPOSById.');
    }

    if (!POS) {
      throw new HttpException(
        'El POS no se encuentra o no existe.',
        HttpStatus.NOT_FOUND,
      );
    }

    return POS;
  }

  async getPOSListByIdEstablishment(
    idEstablishment: number,
  ): Promise<POSListDTO[]> {
    const posList = await this.posRepository.find({
      relations: {
        establecimiento: true,
      },
      where: {
        establecimiento: {
          id: Equal(idEstablishment),
        },
      },
    });

    return posList.map((item) => {
      return {
        id: item.id,
        codigo: item.codigo,
        nombre: item.nombre,
        estado: item.estado,
        establecimiento: {
          id: item.establecimiento.id,
          codigo: item.establecimiento.codigo,
          denominacion: item.establecimiento.denominacion,
        },
      };
    });
  }
}
