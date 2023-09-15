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
      const listTipodocs = await this.tipodocsRepository.find();
      return listTipodocs.map((item) => {
        const { tipo_documento, estado: status, ...data } = item;
        return {
          ...data,
          status,
          nombre: tipo_documento,
        };
      });
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar el tipo de documento TipodocsService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createTipDoc(data: TipodocsCreateDto) {
    const createTipoDoc = this.tipodocsRepository.create({
      tipo_documento: data.nombre,
      ...data,
    });

    //Si encuentra un codigo ya registrado mandamos error
    const codeFound = await this.tipodocsRepository.findOne({
      where: {
        codigo: data.codigo,
      },
    });

    if (codeFound) {
      throw new HttpException(
        'Ya existe un tipo de documento con el mismo codigo ingresado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const obj = await this.tipodocsRepository.save(createTipoDoc);
      const { tipo_documento: nombre, ...res } = obj;
      return {
        ...res,
        nombre,
      };
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

    //Si encuentra un codigo ya registrado mandamos error pero sí debe aceptar el mismo cod actual
    const codeFound = await this.tipodocsRepository.findOne({
      where: {
        codigo: data.codigo,
      },
    });
    if (codeFound && codeFound.id != idTipo) {
      throw new HttpException(
        'Ya existe un tipo de documento con el mismo codigo ingresado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.tipodocsRepository.merge(tipdoc, {
      tipo_documento: data.nombre,
      ...data,
    });

    try {
      const obj = await this.tipodocsRepository.save(tipdoc);
      const { tipo_documento: nombre, ...res } = obj;
      return {
        ...res,
        nombre,
      };
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
