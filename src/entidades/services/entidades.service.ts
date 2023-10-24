import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { DepartamentoEntity } from '../entities/departamento.entity';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProvinciaEntity } from '../entities/provincia.entity';
import { DistritoEntity } from '../entities/distrito.entity';
import { DEPARTAMENTOS, DISTRITOS, PROVINCIAS } from 'src/lib/const/consts';

@Injectable()
export class EntidadesService implements OnModuleInit {
  constructor(
    @InjectRepository(DepartamentoEntity)
    private departamentoRepository: Repository<DepartamentoEntity>,
    @InjectRepository(ProvinciaEntity)
    private provinciaRepository: Repository<ProvinciaEntity>,
    @InjectRepository(DistritoEntity)
    private distritoRepository: Repository<DistritoEntity>,
  ) {}

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
}
