import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TipodocsEntity } from '../entities/tipodocs.entity';
import { In, Repository } from 'typeorm';
import { TipodocsCreateDto } from '../dto/tipodocs-create.dto';
import { TipodocsUpdateDto } from '../dto/tipodocs-update.dto';

@Injectable()
export class TipodocsService {
  constructor(
    @InjectRepository(TipodocsEntity)
    private tipodocsRepository: Repository<TipodocsEntity>,
  ) {}

  async listTipDoc() {
    try {
      return await this.tipodocsRepository.find();
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar el tipo de documento TipodocsService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createTipDoc(data: TipodocsCreateDto) {
    const createTipoDoc = this.tipodocsRepository.create(data);

    try {
      return await this.tipodocsRepository.save(createTipoDoc);
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear el tipo de documento TipodocsService.save.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateTipDoc(idTipo: number, data: TipodocsUpdateDto) {
    const tipdoc = await this.tipodocsRepository.findOne({
      where: { id: idTipo },
    });

    if (!tipdoc) {
      throw new HttpException(
        'El tipo de documento no se encuentra o no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.tipodocsRepository.merge(tipdoc, data);

    try {
      return await this.tipodocsRepository.save(tipdoc);
    } catch (e) {
      throw new HttpException(
        'Error al intentar actualizar el tipo de documento TipodocsService.update.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async disableTipDoc(idTipo: number) {
    let estado = false;

    try {
      await this.tipodocsRepository.update(idTipo, { estado: false });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al deshabilitar documento TipodocsService.disableTipDoc.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async enableTipDoc(idTipo: number) {
    let estado = false;

    try {
      await this.tipodocsRepository.update(idTipo, { estado: true });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al habilitar documento TipodocsService.enableTipDoc.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async findOneTipoDocById(idDocumento: number) {
    let tipoDocumento: TipodocsEntity;

    try {
      tipoDocumento = await this.tipodocsRepository.findOne({
        where: {
          id: idDocumento,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener el tipo de documento TipodocsService.findOneTipoDocById.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // if (!tipoDocumento) {
    //   throw new HttpException(
    //     'El tipo de documento no se encuentra o no existe.',
    //     HttpStatus.NOT_FOUND,
    //   );
    // }

    return tipoDocumento;
  }

  async findOneTipoDocByIds(idDocumento: number[]) {
    try {
      return await this.tipodocsRepository.find({
        where: {
          id: In(idDocumento),
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener los tipo de documentos TipodocsService.findOneTipoDocById.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
