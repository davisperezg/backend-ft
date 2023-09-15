import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeriesEntity } from '../entities/series.entity';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { SeriesUpdateDto } from '../dto/series-update.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaService } from 'src/tipodocs_empresa/services/tipodocs_empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(SeriesEntity)
    private serieRepository: Repository<SeriesEntity>,
    private tipodocService: TipodocsService,
    private tipodocEmpresaService: TipodocsEmpresaService,
    private dataSource: DataSource,
  ) {}

  async allSeries(userToken: QueryToken) {
    try {
      const series = await this.tipodocEmpresaService.allDocuments(userToken);

      const mapSeries = series.map((item) => {
        return {
          empresa: item.razon_social,
          documentos: item.tipodoc_empresa.map((b) => {
            return {
              idDocumento: b.id,
              tipoDocumento: b.tipodoc.tipo_documento,
              estadoDocumento: b.estado,
              series: b.series.map((c) => c.serie),
            };
          }),
        };
      });

      return mapSeries;
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listSeriesByIdEmpresa(idEmpresa: number) {
    try {
      const seriesEmpresa =
        await this.tipodocEmpresaService.findDocumentsByIdEmpresa(idEmpresa);

      const mapSeries = {
        empresa: seriesEmpresa.razon_social,
        documentos: seriesEmpresa.tipodoc_empresa.map((b) => {
          return {
            idDocumento: b.id,
            tipoDocumento: b.tipodoc.tipo_documento,
            estadoDocumento: b.estado,
            series: b.series.map((c) => c.serie),
          };
        }),
      };

      return mapSeries;
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSeries(data: SeriesCreateDto[]) {
    for (let index = 0; index < data.length; index++) {
      const obj = data[index];
      const { documento, series } = obj;
      //Valida id del documento de la empresa
      const doc = await this.tipodocEmpresaService.findOneDocumentByEmpresa(
        documento,
      );

      //Buscamos los documentos de la empresa y seteamos solo series
      const seriesByDocEmpresaExists = (
        await this.serieRepository.find({
          where: {
            documento: {
              id: doc.id,
            },
          },
        })
      ).map((item) => item.serie);

      //Calculamos las series diferentes para eliminar
      const calcDiffSeriesRemove = seriesByDocEmpresaExists.filter(
        (item) => !series.includes(item),
      );

      //Calculamos las series diferentes para agregar
      const calcDiffSeriesAppend = series.filter(
        (item) => !seriesByDocEmpresaExists.includes(item),
      );

      //eliminamos
      if (calcDiffSeriesRemove.length > 0) {
        calcDiffSeriesRemove.map(async (serie) => {
          try {
            await this.serieRepository.delete({
              documento: {
                id: doc.id,
              },
              serie,
            });
          } catch (e) {
            throw new HttpException(
              'Error al intentar crear la serie SeriesService.kik.',
              HttpStatus.BAD_REQUEST,
            );
          }
        });
      }

      //Agregamos
      if (calcDiffSeriesAppend.length > 0) {
        calcDiffSeriesAppend.map(async (serie) => {
          const objCreate = this.serieRepository.create({
            documento: doc,
            serie,
          });

          try {
            await this.serieRepository.save(objCreate);
          } catch (e) {
            throw new HttpException(
              'Error al intentar crear la serie SeriesService.save.',
              HttpStatus.BAD_REQUEST,
            );
          }
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
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

  async findSeriesByDoc(data: SeriesCreateDto[]) {
    const result = [];

    for (let index = 0; index < data.length; index++) {
      const obj = data[index];

      const seriesEmpresa =
        await this.tipodocEmpresaService.findDocumentsOfEmpresa(obj.documento);

      const map = seriesEmpresa.map((item) => {
        return {
          idDocumento: item.id,
          estadoDocumento: item.estado,
          tipoDocumento: {
            id: item.tipodoc.id,
            codigo: item.tipodoc.codigo,
            nombre: item.tipodoc.tipo_documento,
            estado: item.tipodoc.estado,
            series: item.series,
          },
        };
      });

      result.push(map);
    }

    return result;
  }

  diffArray(arr1: any[], arr2: any[]) {
    return arr1
      .concat(arr2)
      .filter((item) => !arr1.includes(item) || !arr2.includes(item));
  }

  diffArrayInexist(arrDb: string[], serie: string) {
    return arrDb.filter((item) => item != serie);
  }
}
