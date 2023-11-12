import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeriesEntity } from '../entities/series.entity';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { SeriesUpdateDto } from '../dto/series-update.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaService } from 'src/tipodocs_empresa/services/tipodocs_empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(SeriesEntity)
    private serieRepository: Repository<SeriesEntity>,
    private tipodocService: TipodocsService,
    private tipodocEmpresaService: TipodocsEmpresaService,
    private empresaService: EmpresaService,
    private establecimientoService: EstablecimientoService,
    private dataSource: DataSource,
  ) {}

  async allSeries(userToken: QueryToken) {
    try {
      const series = await this.serieRepository.find({
        relations: {
          documento: {
            empresa: true,
            tipodoc: true,
          },
          establecimiento: {
            series: true,
          },
        },
        select: {
          establecimiento: {
            id: true,
            codigo: true,
            denominacion: true,
          },
          documento: {
            id: true,
            estado: true,
            empresa: {
              id: true,
              razon_social: true,
            },
          },
        },
      });
      const empresas = (await this.tipodocEmpresaService.allDocuments(
        userToken,
        false,
      )) as EmpresaEntity[];

      const items = empresas.map((empresa) => {
        return {
          empresa: empresa.razon_social,
          documentosAsignados: empresa.tipodoc_empresa.length,
          documentos: empresa.tipodoc_empresa.map(
            (a) => a.tipodoc.tipo_documento,
          ),
          cantidadEstablecimientos: empresa.establecimientos.length,
          establecimientos: empresa.establecimientos.reduce((acc, curr) => {
            const findCountEstablishment = series.find((item) => {
              return item.establecimiento.id === curr.id;
            });

            //Solo muestra los establecimientos con series asignadas
            if (findCountEstablishment) {
              return [
                ...acc,
                {
                  id: curr.id,
                  codigo: curr.codigo,
                  denominacion: curr.denominacion,
                  estado: curr.estado,
                  documentos: curr.series.reduce((result, item) => {
                    const id = item.documento.id;
                    const estado = item.documento.estado;
                    const codigo = item.documento.tipodoc.codigo;
                    const tipoDocumento = item.documento.tipodoc.tipo_documento;

                    // Verificamos si ya hemos agregado este tipo de documento al resultado
                    const tipoDocumentoExistente = result.find(
                      (doc) => doc.id === id,
                    );

                    if (!tipoDocumentoExistente) {
                      // Si no existe, lo agregamos al resultado
                      result.push({
                        id,
                        estado,
                        codigo,
                        nombre: tipoDocumento,
                        series: [
                          {
                            id: item.id,
                            serie: item.serie,
                            estado: item.estado,
                          },
                        ],
                      });
                    } else {
                      // Si ya existe, simplemente agregamos la serie a las series existentes
                      tipoDocumentoExistente.series.push({
                        id: item.id,
                        serie: item.serie,
                        estado: item.estado,
                      });
                    }

                    return result;
                  }, []),
                },
              ];
            }

            return acc;
          }, []),
        };
      });

      return items;
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.list.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listSeriesByIdEmpresa(idEmpresa: number) {
    try {
      const series = await this.serieRepository.find({
        relations: {
          documento: {
            empresa: true,
            tipodoc: true,
          },
          establecimiento: {
            series: true,
          },
        },
        select: {
          establecimiento: {
            id: true,
            codigo: true,
            denominacion: true,
          },
          documento: {
            id: true,
            estado: true,
            empresa: {
              id: true,
              razon_social: true,
            },
          },
        },

        where: {
          documento: {
            empresa: {
              id: idEmpresa,
            },
          },
        },
      });

      const empresa = await this.tipodocEmpresaService.findDocumentsByIdEmpresa(
        idEmpresa,
      );

      const mapSeries = {
        empresa: empresa.razon_social,
        documentosAsignados: empresa.tipodoc_empresa.length,
        documentos: empresa.tipodoc_empresa.map(
          (a) => a.tipodoc.tipo_documento,
        ),
        cantidadEstablecimientos: empresa.establecimientos.length,
        establecimientos: empresa.establecimientos.reduce((acc, curr) => {
          const findCountEstablishment = series.find((item) => {
            return item.establecimiento.id === curr.id;
          });

          //Solo muestra los establecimientos con series asignadas
          if (findCountEstablishment) {
            return [
              ...acc,
              {
                id: curr.id,
                codigo: curr.codigo,
                denominacion: curr.denominacion,
                estado: curr.estado,
                documentos: curr.series.reduce((result, item) => {
                  const id = item.documento.id;
                  const estado = item.documento.estado;
                  const codigo = item.documento.tipodoc.codigo;
                  const tipoDocumento = item.documento.tipodoc.tipo_documento;

                  // Verificamos si ya hemos agregado este tipo de documento al resultado
                  const tipoDocumentoExistente = result.find(
                    (doc) => doc.id === id,
                  );

                  if (!tipoDocumentoExistente) {
                    // Si no existe, lo agregamos al resultado
                    result.push({
                      id,
                      estado,
                      codigo,
                      nombre: tipoDocumento,
                      series: [
                        {
                          id: item.id,
                          serie: item.serie,
                          estado: item.estado,
                        },
                      ],
                    });
                  } else {
                    // Si ya existe, simplemente agregamos la serie a las series existentes
                    tipoDocumentoExistente.series.push({
                      id: item.id,
                      serie: item.serie,
                      estado: item.estado,
                    });
                  }

                  return result;
                }, []),
              },
            ];
          }

          return acc;
        }, []),
      };

      return mapSeries;
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.listSeriesByIdEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSeries(body: SeriesCreateDto) {
    const { documentos, empresa, establecimiento } = body;

    //valida existencia empresa
    const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
      empresa,
      true,
    );

    const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
      (est) => est.id,
    );

    //valida existencia establecimiento
    const findEstablecimiento =
      await this.establecimientoService.findEstablecimientoById(
        establecimiento,
      );

    if (!idsEstablecimientosEmpresa.includes(findEstablecimiento.id)) {
      throw new HttpException(
        'El establecimiento no pertece a la empresa.',
        HttpStatus.NOT_FOUND,
      );
    }

    const keys = Object.keys(documentos);

    try {
      await this.dataSource.transaction(async (entityManager) => {
        for (let index = 0; index < keys.length; index++) {
          const key = Number(keys[index]) && Number(keys[index]) !== 0;
          //Validar las keys
          if (key) {
            const id = Number(keys[index]);
            const validDoc =
              await this.tipodocEmpresaService.findOneDocumentByIdAndIdEmpresa(
                id,
                findEmpresa.id,
              );
            if (validDoc) {
              //Validar los values
              const values = documentos[id];

              const todosLosValoresSonUnicos = values.every(
                (item, index, array) => array.indexOf(item) === index,
              );
              if (!todosLosValoresSonUnicos) {
                throw new HttpException(
                  `values. Existe valores repetidos.`,
                  HttpStatus.BAD_REQUEST,
                );
              }

              for (let index = 0; index < values.length; index++) {
                const value = values[index].toUpperCase();
                const abreviado = validDoc.tipodoc.abreviado;
                const documento = validDoc.tipodoc.tipo_documento;
                const estado = validDoc.estado;
                /**
                 * Si el documento de la empresa esta activo y existe
                 * se procede a validar los abreviados con los regex para
                 * que posteriormente sean aceptados y creados
                 */
                if (estado) {
                  const regexFactura = /F[A-Z0-9]{3}/;
                  const regexBoleta = /B[A-Z0-9]{3}/;
                  if (abreviado === 'F' && !regexFactura.test(value)) {
                    throw new HttpException(
                      'regex. Serie inválida ([F]{1,1}[A-Z0-9]{3,3}).',
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                  if (abreviado === 'B' && !regexBoleta.test(value)) {
                    throw new HttpException(
                      'regex. Serie inválida ([B]{1,1}[A-Z0-9]{3,3}).',
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                  //Agregar mas patters...

                  //No se puede crear series existentes
                  const existSerie = await this.serieRepository.findOne({
                    where: {
                      serie: value,
                      documento: {
                        id: validDoc.id,
                      },
                    },
                  });

                  if (!existSerie) {
                    const createObj = this.serieRepository.create({
                      establecimiento: findEstablecimiento,
                      serie: value,
                      documento: validDoc,
                    });
                    await entityManager.save(SeriesEntity, createObj);
                  } else {
                    throw new HttpException(
                      `serie. La serie ${value} ya existe.`,
                      HttpStatus.BAD_REQUEST,
                    );
                  }

                  // return result;
                } else {
                  throw new HttpException(
                    `values. El documento ${documento} esta desactivado para la empresa o no existe.`,
                    HttpStatus.BAD_REQUEST,
                  );
                }
              }
            }
          } else {
            throw new HttpException(
              'key.id no es un numero o es 0.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      });

      return await this.listSeriesByIdEmpresa(findEmpresa.id);
    } catch (e) {
      throw new HttpException(
        `Error al intentar crear la serie SeriesService.createSeries.save.${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async migrarSeries(body: SeriesCreateDto) {
    const { documentos, empresa, establecimiento } = body;

    //valida existencia empresa
    const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
      empresa,
      true,
    );

    const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
      (est) => est.id,
    );

    //valida existencia establecimiento
    const findEstablecimiento =
      await this.establecimientoService.findEstablecimientoById(
        establecimiento,
      );

    if (!idsEstablecimientosEmpresa.includes(findEstablecimiento.id)) {
      throw new HttpException(
        'El establecimiento no pertece a la empresa.',
        HttpStatus.NOT_FOUND,
      );
    }

    const keys = Object.keys(documentos);

    try {
      await this.dataSource.transaction(async (entityManager) => {
        for (let index = 0; index < keys.length; index++) {
          const key = Number(keys[index]) && Number(keys[index]) !== 0;
          //Validar las keys
          if (key) {
            const id = Number(keys[index]);
            const validDoc =
              await this.tipodocEmpresaService.findOneDocumentByIdAndIdEmpresa(
                id,
                findEmpresa.id,
              );
            if (validDoc) {
              //Validar los values
              const values = documentos[id];

              const todosLosValoresSonUnicos = values.every(
                (item, index, array) => array.indexOf(item) === index,
              );
              if (!todosLosValoresSonUnicos) {
                throw new HttpException(
                  `values. Existe valores repetidos.`,
                  HttpStatus.BAD_REQUEST,
                );
              }

              for (let index = 0; index < values.length; index++) {
                const value = values[index].toUpperCase();
                const abreviado = validDoc.tipodoc.abreviado;
                const documento = validDoc.tipodoc.tipo_documento;
                const estado = validDoc.estado;
                /**
                 * Si el documento de la empresa esta activo y existe
                 * se procede a validar los abreviados con los regex para
                 * que posteriormente sean aceptados y creados
                 */
                if (estado) {
                  const regexFactura = /F[A-Z0-9]{3}/;
                  const regexBoleta = /B[A-Z0-9]{3}/;
                  if (abreviado === 'F' && !regexFactura.test(value)) {
                    throw new HttpException(
                      'regex. Serie inválida ([F]{1,1}[A-Z0-9]{3,3}).',
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                  if (abreviado === 'B' && !regexBoleta.test(value)) {
                    throw new HttpException(
                      'regex. Serie inválida ([B]{1,1}[A-Z0-9]{3,3}).',
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                  //Agregar mas patters...

                  //No se puede crear series existentes
                  const existSerie = await this.serieRepository.findOne({
                    where: {
                      serie: value,
                      documento: {
                        id: validDoc.id,
                      },
                    },
                  });

                  if (existSerie) {
                    await entityManager.update(
                      SeriesEntity,
                      {
                        id: existSerie.id,
                      },
                      {
                        establecimiento: findEstablecimiento,
                        serie: value,
                        documento: validDoc,
                      },
                    );
                  } else {
                    throw new HttpException(
                      `serie. La serie ${value} no existe, para migrar la serie debe existir.`,
                      HttpStatus.BAD_REQUEST,
                    );
                  }

                  // return result;
                } else {
                  throw new HttpException(
                    `values. El documento ${documento} esta desactivado para la empresa o no existe.`,
                    HttpStatus.BAD_REQUEST,
                  );
                }
              }
            }
          } else {
            throw new HttpException(
              'key.id no es un numero o es 0.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      });

      return await this.listSeriesByIdEmpresa(findEmpresa.id);
    } catch (e) {
      throw new HttpException(
        `Error al intentar migrar la serie SeriesService.migrarSeries.update.${e.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  // async createSeries(data: SeriesCreateDto[]) {
  //   for (let index = 0; index < data.length; index++) {
  //     const obj = data[index];
  //     const { documento, series } = obj;
  //     //Valida id del documento de la empresa
  //     const doc = await this.tipodocEmpresaService.findOneDocumentByEmpresa(
  //       documento,
  //     );

  //     //Buscamos los documentos de la empresa y seteamos solo series
  //     const seriesByDocEmpresaExists = (
  //       await this.serieRepository.find({
  //         where: {
  //           documento: {
  //             id: doc.id,
  //           },
  //         },
  //       })
  //     ).map((item) => item.serie);

  //     //Calculamos las series diferentes para eliminar
  //     const calcDiffSeriesRemove = seriesByDocEmpresaExists.filter(
  //       (item) => !series.includes(item),
  //     );

  //     //Calculamos las series diferentes para agregar
  //     const calcDiffSeriesAppend = series.filter(
  //       (item) => !seriesByDocEmpresaExists.includes(item),
  //     );

  //     //eliminamos
  //     if (calcDiffSeriesRemove.length > 0) {
  //       calcDiffSeriesRemove.map(async (serie) => {
  //         try {
  //           await this.serieRepository.delete({
  //             documento: {
  //               id: doc.id,
  //             },
  //             serie,
  //           });
  //         } catch (e) {
  //           throw new HttpException(
  //             'Error al intentar crear la serie SeriesService.kik.',
  //             HttpStatus.BAD_REQUEST,
  //           );
  //         }
  //       });
  //     }

  //     //Agregamos
  //     if (calcDiffSeriesAppend.length > 0) {
  //       calcDiffSeriesAppend.map(async (serie) => {
  //         const objCreate = this.serieRepository.create({
  //           documento: doc,
  //           serie,
  //         });

  //         try {
  //           await this.serieRepository.save(objCreate);
  //         } catch (e) {
  //           throw new HttpException(
  //             'Error al intentar crear la serie SeriesService.save.',
  //             HttpStatus.BAD_REQUEST,
  //           );
  //         }
  //       });
  //     }
  //   }

  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  // }

  async updateSeries(idSerie: number, data: SeriesUpdateDto) {}
  // async updateSeries(idSerie: number, data: SeriesUpdateDto) {
  //   const { documento: idDocumento } = data;

  //   const tipdoc = await this.serieRepository.findOne({
  //     where: { id: idSerie },
  //   });

  //   const getDocument = await this.tipodocService.findOneTipoDocById(
  //     idDocumento,
  //   );

  //   if (!tipdoc) {
  //     throw new HttpException(
  //       'La serie no se encuentra o no existe.',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   this.serieRepository.merge(tipdoc, {
  //     ...data,
  //     documento: getDocument,
  //   });

  //   try {
  //     return await this.serieRepository.save(tipdoc);
  //   } catch (e) {
  //     throw new HttpException(
  //       'Error al intentar actualizar la serie SeriesService.update.',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  // }

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
    // const result = [];
    // for (let index = 0; index < data.length; index++) {
    //   const obj = data[index];
    //   const seriesEmpresa =
    //     await this.tipodocEmpresaService.findDocumentsOfEmpresa(obj.documento);
    //   const map = seriesEmpresa.map((item) => {
    //     return {
    //       idDocumento: item.id,
    //       estadoDocumento: item.estado,
    //       // tipoDocumento: {
    //       //   id: item.tipodoc.id,
    //       //   codigo: item.tipodoc.codigo,
    //       //   nombre: item.tipodoc.tipo_documento,
    //       //   estado: item.tipodoc.estado,
    //       //   series: item.series,
    //       // },
    //     };
    //   });
    //   result.push(map);
    // }
    // return result;
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
