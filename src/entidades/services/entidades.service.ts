import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { DepartamentoEntity } from '../entities/departamento.entity';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProvinciaEntity } from '../entities/provincia.entity';
import { DistritoEntity } from '../entities/distrito.entity';
import { DEPARTAMENTOS, DISTRITOS, PROVINCIAS } from 'src/lib/const/consts';
import { EntidadEntity } from '../entities/entidad.entity';
import { TipoEntidadService } from 'src/tipo-entidades/services/tipo-entidades.service';

@Injectable()
export class EntidadesService implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    @InjectRepository(DepartamentoEntity)
    private departamentoRepository: Repository<DepartamentoEntity>,
    @InjectRepository(ProvinciaEntity)
    private provinciaRepository: Repository<ProvinciaEntity>,
    @InjectRepository(DistritoEntity)
    private distritoRepository: Repository<DistritoEntity>,
    @InjectRepository(EntidadEntity)
    private entidadRepository: Repository<EntidadEntity>,
    private tipoEntidadService: TipoEntidadService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.entidadRepository.count();

    if (count > 0) return;

    const tipo = await this.tipoEntidadService.findTipoEntidadByTipo('DNI');

    //Creamos una entidad para las boletas
    const entidad = this.entidadRepository.create({
      tipo_entidad: tipo,
      entidad: 'CLIENTE VARIOS',
      numero_documento: '00000000',
      direccion: '-',
    });

    await this.entidadRepository.save(entidad);
  }

  async onModuleInit() {
    const count = await this.departamentoRepository.count();

    if (count > 0) return;

    const departamentos = this.departamentoRepository.create(DEPARTAMENTOS);
    await this.departamentoRepository.insert(departamentos);

    const provincias = this.provinciaRepository.create(PROVINCIAS);
    await this.provinciaRepository.insert(provincias);

    const distritos = this.distritoRepository.create(DISTRITOS);
    await this.distritoRepository.insert(distritos);
  }

  async getDepartamentos() {
    try {
      const departamentos = await this.departamentoRepository.find();
      return departamentos.map((a) => {
        return {
          ...a,
          departamento: a.departamento.toUpperCase(),
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar los departamentos.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getProvincias() {
    try {
      const provincias = await this.provinciaRepository.find();

      return provincias.map((a) => {
        return {
          ...a,
          provincia: a.provincia.toUpperCase(),
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar las provincias.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getDistritos() {
    try {
      const distritos = await this.distritoRepository.find();
      return distritos.map((a) => {
        return {
          ...a,
          distrito: a.distrito.toUpperCase(),
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar las distritos.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getProvinciasByDepartamento(idDepartamento: string) {
    try {
      const provincias = await this.provinciaRepository.findBy({
        id: Like(`${idDepartamento}%`),
      });
      return provincias.map((a) => {
        return {
          ...a,
          provincia: a.provincia.toUpperCase(),
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar las provincias.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getDistritosByProvincia(idProvincia: string) {
    try {
      const distritos = await this.distritoRepository.findBy({
        id: Like(`${idProvincia}%`),
      });
      return distritos.map((a) => {
        return {
          ...a,
          distrito: a.distrito.toUpperCase(),
        };
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar las distritos.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listEntidadByEmpresa(idEmpresa: number) {
    try {
      return await this.entidadRepository.find({
        relations: {
          tipo_entidad: true,
        },
        where: {
          empresa: {
            id: idEmpresa,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        `Error al listar las entidades.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
