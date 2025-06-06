import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstablecimientoEntity } from '../entities/establecimiento.entity';
import { Equal, Repository } from 'typeorm';
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
    const empresa = (await this.empresaService.findOneEmpresaById(
      body.data.empresa,
      true,
    )) as EmpresaEntity;

    if (!empresa.estado) {
      throw new HttpException(
        'La empresa está desactivada.',
        HttpStatus.NOT_FOUND,
      );
    }

    const createObj = this.establecimientoRepository.create({
      ...body.data,
      estado: body.data.estado,
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
    const empresa = (await this.empresaService.findOneEmpresaById(
      body.data.empresa,
      true,
    )) as EmpresaEntity;

    if (!empresa.estado) {
      throw new HttpException(
        'La empresa está desactivada.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const establecimiento = await this.establecimientoRepository.findOne({
        where: {
          id,
        },
      });

      const createObj = this.establecimientoRepository.merge(establecimiento, {
        ...body.data,
        estado: body.data.estado,
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

  async findEstablecimientoById(idEstablishment: number) {
    let establecimiento: EstablecimientoEntity;

    try {
      establecimiento = await this.establecimientoRepository.findOne({
        relations: {
          configsEstablecimiento: true,
        },
        where: {
          id: Equal(idEstablishment),
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

  async findAllEstablecimientos() {
    let establecimientos: EstablecimientoEntity[];

    try {
      establecimientos = await this.establecimientoRepository.find({
        relations: {
          configsEstablecimiento: true,
          empresa: true,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al intentar obtener establecimientos EstablecimientoService.findAllEstablecimientos.',
        HttpStatus.NOT_FOUND,
      );
    }

    return establecimientos;
  }

  async findAllEstablishmentsByCompany(idCompany: number) {
    let establecimientos: EstablecimientoEntity[];

    try {
      establecimientos = await this.establecimientoRepository.find({
        where: {
          empresa: {
            id: Equal(idCompany),
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al intentar obtener establecimientos EstablecimientoService.findAllEstablishmentsByCompany.',
        HttpStatus.NOT_FOUND,
      );
    }

    return establecimientos;
  }
}
