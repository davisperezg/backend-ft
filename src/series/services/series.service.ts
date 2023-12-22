import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeriesEntity } from '../entities/series.entity';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaService } from 'src/tipodocs_empresa/services/tipodocs_empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';

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
          id: empresa.id,
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
          status: empresa.estado,
        };
      });

      // Filtrar items para incluir solo aquellos con establecimientos con series asignadas
      const filteredItems = items.filter(
        (item) => item.establecimientos.length > 0,
      );

      return filteredItems;
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

          return [
            ...acc,
            {
              id: curr.id,
              codigo: curr.codigo,
              denominacion: curr.denominacion,
              estado: curr.estado,
              documentos: [],
            },
          ];
        }, []),
        status: empresa.estado,
      };
      return mapSeries;
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.listSeriesByIdEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSeries(body: SeriesCreateDto, userToken: QueryToken) {
    const { documentos, empresa, establecimiento } = body;
    const { tokenEntityFull } = userToken;

    //valida existencia y estado de la empresa
    const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
      empresa,
      true,
    );

    /**
     * Solo el rol principal puede crear series de cualquier empresa
     * los demas roles solo pueden crear series de la empresa a la que pertenecen.
     */
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
      const findEmpresaToken = tokenEntityFull.empresas.find(
        (empresa) => empresa.id === findEmpresa.id,
      );

      if (!findEmpresaToken) {
        throw new HttpException(
          'Solo puedes crear series de la empresa a la que perteneces.',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
      (est) => est.id,
    );

    //valida existencia y estado del establecimiento
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
            //Valida estado y existencia del documento de la empresa
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
                //const documento = validDoc.tipodoc.tipo_documento;
                //const estado = validDoc.estado;
                /**
                 * Se procede a validar los abreviados con los regex para
                 * que posteriormente sean aceptados y creados
                 */
                //if (estado) {
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
                //}
                // else {
                //   throw new HttpException(
                //     `values. El documento ${documento} esta desactivado para la empresa o no existe.`,
                //     HttpStatus.BAD_REQUEST,
                //   );
                // }
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

  async migrarSeries(body: SeriesCreateDto, userToken: QueryToken) {
    const { documentos, empresa, establecimiento } = body;
    const { tokenEntityFull } = userToken;

    //valida existencia y estado de la empresa
    const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
      empresa,
      true,
    );

    /**
     * Solo el rol principal puede migrar series de cualquier empresa
     * los demas roles solo pueden migrar series de la empresa a la que pertenecen.
     */
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
      const findEmpresaToken = tokenEntityFull.empresas.find(
        (empresa) => empresa.id === findEmpresa.id,
      );
      if (!findEmpresaToken) {
        throw new HttpException(
          'Solo puedes migrar series de la empresa a la que perteneces.',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
      (est) => est.id,
    );

    //valida existencia y estado del establecimiento
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
            //Valida estado y existencia del documento de la empresa
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
                //const documento = validDoc.tipodoc.tipo_documento;
                //const estado = validDoc.estado;
                /**
                 * Se procede a validar los abreviados con los regex para
                 * que posteriormente sean aceptados y creados
                 */
                //if (estado) {
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
                  relations: {
                    establecimiento: true,
                  },
                  where: {
                    serie: value,
                    documento: {
                      id: validDoc.id,
                    },
                  },
                });

                if (existSerie) {
                  //Solo actualizara las series que no pertenezcan al establecimiento
                  if (
                    existSerie &&
                    existSerie.establecimiento.id !== findEstablecimiento.id
                  ) {
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
                    //Si la serie ya pertenece al establecimiento no se actualizara
                    throw new HttpException(
                      `serie. La serie ${value} ya pertenece al establecimiento destino.`,
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                } else {
                  throw new HttpException(
                    `serie. La serie ${value} no existe, para migrar la serie debe existir.`,
                    HttpStatus.BAD_REQUEST,
                  );
                }

                // return result;
                //}
                // else {
                //   throw new HttpException(
                //     `values. El documento ${documento} esta desactivado para la empresa o no existe.`,
                //     HttpStatus.BAD_REQUEST,
                //   );
                // }
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

  async disableSeries(idSerie: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    let estado = false;

    const findSerie = await this.findOneSerieById(idSerie);
    if (!findSerie) {
      throw new HttpException('No se encontro la serie.', HttpStatus.NOT_FOUND);
    }

    if (!findSerie.estado) {
      throw new HttpException(
        'No puedes deshabilitar una serie que ya esta deshabilitada.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        await this.serieRepository.update(idSerie, {
          estado: false,
        });

        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al deshabilitar serie SeriesService.disableSerie.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //REVISAR
      const { empresas } = tokenEntityFull;
      for (let index = 0; index < empresas.length; index++) {
        const empresaToken = empresas[index];
        const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
          empresaToken.id,
          true,
        );

        const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
          (est) => est.id,
        );

        if (
          !idsEstablecimientosEmpresa.includes(findSerie.establecimiento.id)
        ) {
          throw new HttpException(
            'No puedes deshabilitar una serie que no pertece a la empresa.',
            HttpStatus.NOT_FOUND,
          );
        }
      }

      try {
        await this.serieRepository.update(idSerie, {
          estado: false,
        });
        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al deshabilitar serie SeriesService.disableSerie.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return estado;
  }

  async enableSeries(idSerie: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    let estado = false;

    const findSerie = await this.findOneSerieById(idSerie);
    if (!findSerie) {
      throw new HttpException('No se encontro la serie.', HttpStatus.NOT_FOUND);
    }

    if (findSerie.estado) {
      throw new HttpException(
        'No puedes habilitar una serie que ya esta habilitada.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        await this.serieRepository.update(idSerie, {
          estado: true,
        });
        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al habilitar serie SeriesService.enableSerie.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //REVISAR
      const { empresas } = tokenEntityFull;
      for (let index = 0; index < empresas.length; index++) {
        const empresaToken = empresas[index];
        const findEmpresa = await this.empresaService.findOneEmpresaByIdx(
          empresaToken.id,
          true,
        );

        const idsEstablecimientosEmpresa = findEmpresa.establecimientos.map(
          (est) => est.id,
        );

        if (
          !idsEstablecimientosEmpresa.includes(findSerie.establecimiento.id)
        ) {
          throw new HttpException(
            'No puedes habilitar una serie que no pertece a la empresa.',
            HttpStatus.NOT_FOUND,
          );
        }
      }

      try {
        await this.serieRepository.update(idSerie, {
          estado: true,
        });
        estado = true;
      } catch (e) {
        throw new HttpException(
          'Error al habilitar serie SeriesService.enableSerie.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return estado;
  }

  async findOneSerieById(idSerie: number) {
    try {
      return await this.serieRepository.findOne({
        relations: {
          establecimiento: true,
        },
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
