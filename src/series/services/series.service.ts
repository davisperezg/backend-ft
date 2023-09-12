import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeriesEntity } from '../entities/series.entity';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { SeriesUpdateDto } from '../dto/series-update.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(SeriesEntity)
    private serieRepository: Repository<SeriesEntity>,
    private tipodocService: TipodocsService,
  ) {}

  async listSeries() {
    try {
      return await this.serieRepository.find();
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSeries(data: SeriesCreateDto) {
    const { documento: idDocumento } = data;
    const getDocument = await this.tipodocService.findOneTipoDocById(
      idDocumento,
    );

    const createTipoDoc = this.serieRepository.create({
      ...data,
      documento: getDocument,
    });

    try {
      return await this.serieRepository.save(createTipoDoc);
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear la serie SeriesService.save.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateSeries(idSerie: number, data: SeriesUpdateDto) {
    const { documento: idDocumento } = data;

    const tipdoc = await this.serieRepository.findOne({
      where: { id: idSerie },
    });

    const getDocument = await this.tipodocService.findOneTipoDocById(
      idDocumento,
    );

    if (!tipdoc) {
      throw new HttpException(
        'La serie no se encuentra o no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.serieRepository.merge(tipdoc, {
      ...data,
      documento: getDocument,
    });

    try {
      return await this.serieRepository.save(tipdoc);
    } catch (e) {
      throw new HttpException(
        'Error al intentar actualizar la serie SeriesService.update.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async disableSeries(idTipo: number) {
    let estado = false;

    try {
      await this.serieRepository.update(idTipo, { estado: false });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al deshabilitar serie SeriesService.disableSerie.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async enableSeries(idTipo: number) {
    let estado = false;

    try {
      await this.serieRepository.update(idTipo, { estado: true });
      estado = true;
    } catch (e) {
      throw new HttpException(
        'Error al habilitar serie SeriesService.enableSerie.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return estado;
  }

  async findOneSerieById(idSerie: number) {
    try {
      return await this.serieRepository.findOne({
        where: {
          id: idSerie,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener la serie SeriesService.findOneSerieById.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
