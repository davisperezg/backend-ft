import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstablecimientoEntity } from '../entities/establecimiento.entity';
import { Repository } from 'typeorm';
import { EstablecimientoCreateDto } from '../dto/establecimiento-create.dto';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';

@Injectable()
export class EstablecimientoService {
  constructor(
    @InjectRepository(EstablecimientoEntity)
    private establecimientoRepository: Repository<EstablecimientoEntity>,
    @Inject(forwardRef(() => EmpresaService))
    private empresaService: EmpresaService,
  ) {}

  async createEstablecimiento(body: {
    data: EstablecimientoCreateDto;
    files: any;
  }) {
    const empresa = (await this.empresaService.findOneEmpresaByIdx(
      body.data.empresa,
      true,
    )) as EmpresaEntity;

    const createObj = this.establecimientoRepository.create({
      ...body.data,
      estado: body.data.status,
      logo: body.files,
      empresa,
    });

    try {
      return await this.establecimientoRepository.save(createObj);
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear establecimiento EstablecimientoService.save.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async editEstablecimiento(
    id: number,
    body: {
      data: EstablecimientoCreateDto;
      files: any;
    },
  ) {
    const empresa = (await this.empresaService.findOneEmpresaByIdx(
      body.data.empresa,
      true,
    )) as EmpresaEntity;

    try {
      const establecimiento = await this.establecimientoRepository.findOne({
        where: {
          id,
        },
      });

      const createObj = this.establecimientoRepository.merge(establecimiento, {
        ...body.data,
        estado: body.data.status,
        logo: body.files,
        empresa,
      });

      return await this.establecimientoRepository.save(createObj);
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear establecimiento EstablecimientoService.editEstablecimiento.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async findEstablecimientoById(id: number) {
    let establecimiento: EstablecimientoEntity;

    try {
      establecimiento = await this.establecimientoRepository.findOne({
        where: {
          id,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al intentar obtener establecimiento EstablecimientoService.findEstablecimientoById.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!establecimiento) {
      throw new HttpException(
        'El establecimiento no se encuentra o no existe.',
        HttpStatus.NOT_FOUND,
      );
    }

    return establecimiento;
  }
}
