import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, Repository } from 'typeorm';
import { SeriesEntity } from '../entities/series.entity';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { TipodocsEmpresaService } from 'src/tipodocs_empresa/services/tipodocs_empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { EstablecimientoService } from 'src/establecimiento/services/establecimiento.service';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { completarConCeros } from 'src/lib/functions';
import { PosService } from 'src/pos/services/pos.service';
import { SeriesMigrateDto } from '../dto/series-migrate.dto';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(SeriesEntity)
    private readonly serieRepository: Repository<SeriesEntity>,
    private readonly tipodocService: TipodocsService,
    private readonly tipodocEmpresaService: TipodocsEmpresaService,
    private readonly empresaService: EmpresaService,
    private readonly establecimientoService: EstablecimientoService,
    private readonly dataSource: DataSource,
    private readonly posService: PosService,
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
          pos: true,
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

      const items = await Promise.all(
        empresas.map(async (empresa) => {
          return {
            id: empresa.id,
            empresa: empresa.razon_social,
            documentosAsignados: empresa.tipodoc_empresa.length,
            documentos: empresa.tipodoc_empresa.map(
              (a) => a.tipodoc.tipo_documento,
            ),
            cantidadEstablecimientos: empresa.establecimientos.length,
            establecimientos: (
              await Promise.all(
                empresa.establecimientos.map(async (curr) => {
                  // Obtener los POS asociados al establecimiento
                  const posList =
                    await this.posService.getPOSListByIdEstablishment(curr.id);

                  if (!posList || posList.length === 0) return null; // Excluir establecimientos sin POS

                  // Filtrar las series que pertenecen a este establecimiento
                  const seriesDelEstablecimiento = series.filter(
                    (s) => s.establecimiento.id === curr.id,
                  );

                  if (
                    !seriesDelEstablecimiento ||
                    seriesDelEstablecimiento.length === 0
                  )
                    return null; // Excluir establecimientos sin series asignadas

                  // Procesar cada POS con sus documentos y series
                  const posConDocumentos = posList
                    .map((pos) => {
                      // Filtrar solo las series que pertenecen a este POS
                      const seriesDelPos = seriesDelEstablecimiento.filter(
                        (s) => s.pos?.id === pos.id,
                      );

                      if (!seriesDelPos || seriesDelPos.length === 0)
                        return null; // Excluir POS sin series

                      // Agrupar series por documento
                      const documentos = seriesDelPos.reduce((result, item) => {
                        const id = item.documento.id;
                        const estado = item.documento.estado;
                        const codigo = item.documento.tipodoc.codigo;
                        const nombre = item.documento.tipodoc.tipo_documento;

                        // Buscar si el documento ya fue agregado
                        const docExistente = result.find(
                          (doc) => doc.id === id,
                        );

                        if (!docExistente) {
                          result.push({
                            id,
                            estado,
                            codigo,
                            nombre,
                            series: [
                              {
                                id: item.id,
                                serie: item.serie,
                                estado: item.estado,
                                numeroConCeros: completarConCeros(item.numero),
                                numero: item.numero,
                              },
                            ],
                          });
                        } else {
                          docExistente.series.push({
                            id: item.id,
                            serie: item.serie,
                            estado: item.estado,
                            numeroConCeros: completarConCeros(item.numero),
                            numero: item.numero,
                          });
                        }

                        return result;
                      }, []);

                      return {
                        id: pos.id,
                        nombre: pos.nombre,
                        estado: pos.estado,
                        documentos,
                      };
                    })
                    .filter((pos) => pos !== null); // Elimina POS vacíos

                  if (posConDocumentos.length === 0) return null; // Excluir establecimientos sin POS válidos

                  return {
                    id: curr.id,
                    codigo: curr.codigo,
                    denominacion: curr.denominacion,
                    estado: curr.estado,
                    configuraciones: curr.configsEstablecimiento,
                    departamento: curr.departamento,
                    provincia: curr.provincia,
                    distrito: curr.distrito,
                    direccion: curr.direccion,
                    logo: curr.logo,
                    pos: posConDocumentos,
                  };
                }),
              )
            ).filter((establecimiento) => establecimiento !== null), // Elimina establecimientos vacíos
            status: empresa.estado,
          };
        }),
      );

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

  async listSeriesByIdEstablishment(establishmentId: number) {
    try {
      const series = await this.serieRepository.find({
        relations: {
          documento: {
            empresa: true,
            tipodoc: true,
          },
          establecimiento: {
            configsEstablecimiento: true,
            series: true,
          },
          empresa: true,
          pos: true,
        },
        select: {
          establecimiento: {
            id: true,
            codigo: true,
            denominacion: true,
            configsEstablecimiento: true,
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
          establecimiento: {
            id: Equal(establishmentId),
          },
        },
      });

      const posList = await this.posService.getPOSListByIdEstablishment(
        establishmentId,
      );

      return posList
        .map((pos) => {
          // Filtrar series pertenecientes al POS
          const seriesDelPos = series.filter((s) => s.pos?.id === pos.id);

          if (seriesDelPos.length === 0) return null; // Excluir POS sin series

          // Agrupar series por documento dentro de este POS
          const documentos = seriesDelPos.reduce((docsResult, item) => {
            //if (!item.documento.estado) return docsResult; // Filtrar solo documentos activos

            // Buscar si el documento ya fue agregado
            let docExistente = docsResult.find(
              (doc) => doc.id === item.documento.id,
            );

            if (!docExistente) {
              docExistente = {
                id: item.documento.id,
                estado: item.documento.estado,
                codigo: item.documento.tipodoc.codigo,
                nombre: item.documento.tipodoc.tipo_documento,
                series: [],
              };
              docsResult.push(docExistente);
            }

            // Agregar solo series activas
            if (item.estado) {
              docExistente.series.push({
                id: item.id,
                serie: item.serie,
                estado: item.estado,
                numeroConCeros: completarConCeros(item.numero),
                numero: item.numero,
              });
            }

            return docsResult;
          }, []);

          // Si un documento no tiene series activas, aseguramos que `series: []`
          documentos.forEach((doc) => {
            if (doc.series.length === 0) {
              doc.series = []; // Asegurar que esté vacío si todas sus series están inactivas
            }
          });

          // Filtrar solo documentos con estado `true`
          // const documentosActivos = documentos.filter((doc) => doc.estado);

          // // Si un POS tiene solo documentos inactivos, `documentos` será un array vacío
          // if (documentosActivos.length === 0) {
          //   return {
          //     id: pos.id,
          //     nombre: pos.nombre,
          //     estado: pos.estado,
          //     codigo: pos.codigo,
          //     documentos: [],
          //   };
          // }

          return {
            id: pos.id,
            nombre: pos.nombre,
            estado: pos.estado,
            codigo: pos.codigo,
            documentos: documentos,
          };
        })
        .filter(Boolean); // Elimina los `null` (POS sin datos válidos)
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar las series SeriesService.listSeriesByIdEstablishment.',
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
            configsEstablecimiento: true,
            series: true,
          },
          pos: true,
        },
        select: {
          establecimiento: {
            id: true,
            codigo: true,
            denominacion: true,
            configsEstablecimiento: true,
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
        establecimientos: (
          await Promise.all(
            empresa.establecimientos.map(async (curr) => {
              // Obtener los POS asociados al establecimiento
              const posList = await this.posService.getPOSListByIdEstablishment(
                curr.id,
              );

              if (!posList || posList.length === 0) return null; // Excluir establecimientos sin POS

              // Filtrar las series que pertenecen a este establecimiento
              const seriesDelEstablecimiento = series.filter(
                (s) => s.establecimiento.id === curr.id,
              );

              if (
                !seriesDelEstablecimiento ||
                seriesDelEstablecimiento.length === 0
              )
                return null; // Excluir establecimientos sin series asignadas

              // Procesar cada POS con sus documentos y series
              const posConDocumentos = posList
                .map((pos) => {
                  // Filtrar solo las series que pertenecen a este POS
                  const seriesDelPos = seriesDelEstablecimiento.filter(
                    (s) => s.pos?.id === pos.id,
                  );

                  if (!seriesDelPos || seriesDelPos.length === 0) return null; // Excluir POS sin series

                  // Agrupar series por documento
                  const documentos = seriesDelPos.reduce((result, item) => {
                    const id = item.documento.id;
                    const estado = item.documento.estado;
                    const codigo = item.documento.tipodoc.codigo;
                    const nombre = item.documento.tipodoc.tipo_documento;

                    // Buscar si el documento ya fue agregado
                    const docExistente = result.find((doc) => doc.id === id);

                    if (!docExistente) {
                      result.push({
                        id,
                        estado,
                        codigo,
                        nombre,
                        series: [
                          {
                            id: item.id,
                            serie: item.serie,
                            estado: item.estado,
                            numeroConCeros: completarConCeros(item.numero),
                            numero: item.numero,
                          },
                        ],
                      });
                    } else {
                      docExistente.series.push({
                        id: item.id,
                        serie: item.serie,
                        estado: item.estado,
                        numeroConCeros: completarConCeros(item.numero),
                        numero: item.numero,
                      });
                    }

                    return result;
                  }, []);

                  return {
                    id: pos.id,
                    nombre: pos.nombre,
                    estado: pos.estado,
                    documentos,
                  };
                })
                .filter((pos) => pos !== null); // Elimina POS vacíos

              if (posConDocumentos.length === 0) return null; // Excluir establecimientos sin POS válidos

              return {
                id: curr.id,
                codigo: curr.codigo,
                denominacion: curr.denominacion,
                estado: curr.estado,
                configuraciones: curr.configsEstablecimiento,
                departamento: curr.departamento,
                provincia: curr.provincia,
                distrito: curr.distrito,
                direccion: curr.direccion,
                logo: curr.logo,
                pos: posConDocumentos,
              };
            }),
          )
        ).filter((establecimiento) => establecimiento !== null), // Elimina establecimientos vacíos
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
    const { pos, empresa, establecimiento } = body;
    const { tokenEntityFull } = userToken;

    //valida existencia y estado de la empresa
    const findEmpresa = (await this.empresaService.findOneEmpresaById(
      empresa,
      true,
    )) as EmpresaEntity;
    if (!findEmpresa.estado) {
      throw new HttpException(
        'La empresa está desactivada.',
        HttpStatus.NOT_FOUND,
      );
    }

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

    if (!findEstablecimiento.estado) {
      throw new HttpException(
        'El establecimiento está desactivado.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!idsEstablecimientosEmpresa.includes(findEstablecimiento.id)) {
      throw new HttpException(
        'El establecimiento no pertece a la empresa.',
        HttpStatus.NOT_FOUND,
      );
    }

    const seriesByDocument = new Map();

    try {
      await this.dataSource.transaction(async (entityManager) => {
        for (let index = 0; index < pos.length; index++) {
          const POS = pos[index];
          const foundPOS = await this.posService.findPOSById(POS.id);

          const posLabel = foundPOS.codigo + ' - ' + foundPOS.nombre;

          // Validar que el POS le pertenece a la empresa
          if (foundPOS.establecimiento.empresa.id !== findEmpresa.id) {
            throw new HttpException(
              ` El POS ${posLabel} no pertenece a la empresa.`,
              HttpStatus.NOT_FOUND,
            );
          }

          // Validar que el POS le pertenece al establecimiento
          if (foundPOS.establecimiento.id !== findEstablecimiento.id) {
            throw new HttpException(
              ` El POS ${posLabel} no pertenece al establecimiento de la empresa.`,
              HttpStatus.NOT_FOUND,
            );
          }

          if (!foundPOS.estado) {
            throw new HttpException(
              ` El POS ${posLabel} está desactivado.`,
              HttpStatus.NOT_FOUND,
            );
          }

          const documentos = pos[index].documentos;

          for (let index = 0; index < documentos.length; index++) {
            const document = documentos[index];
            const foundDocument =
              await this.tipodocEmpresaService.findOneDocumentByIdAndIdEmpresa(
                document.id,
                findEmpresa.id,
              );

            if (foundDocument) {
              const series = document.series;

              for (let index = 0; index < series.length; index++) {
                const item = series[index];

                const serieLabel = item.serie.toUpperCase();
                const abreviado = foundDocument.tipodoc.abreviado;
                /**
                 * Se procede a validar los abreviados con los regex para
                 * que posteriormente sean aceptados y creados
                 */
                const regexFactura = /F[A-Z0-9]{3}/;
                const regexBoleta = /B[A-Z0-9]{3}/;

                if (abreviado === 'F' && !regexFactura.test(serieLabel)) {
                  throw new HttpException(
                    'regex. Serie inválida ([F]{1,1}[A-Z0-9]{3,3}).',
                    HttpStatus.BAD_REQUEST,
                  );
                }

                if (abreviado === 'B' && !regexBoleta.test(serieLabel)) {
                  throw new HttpException(
                    'regex. Serie inválida ([B]{1,1}[A-Z0-9]{3,3}).',
                    HttpStatus.BAD_REQUEST,
                  );
                }
                //Agregar mas patters...

                const existSerie = await this.serieRepository.findOne({
                  relations: {
                    establecimiento: true,
                    pos: true,
                  },
                  where: {
                    serie: serieLabel,
                    documento: {
                      id: foundDocument.id,
                    },
                  },
                });

                // Si no encuentra id en el item, es porque es una serie nueva
                if (!item.id) {
                  // Si el documento no está en el Map, se crea un nuevo Set vacío
                  if (!seriesByDocument.has(foundDocument.id)) {
                    seriesByDocument.set(foundDocument.id, new Set());
                  }

                  // Obtenemos los codigos actuales del documento
                  const codes = seriesByDocument.get(foundDocument.id);

                  // Validar si la serie ya existe en el Set dentro del mismo documento
                  if (codes.has(serieLabel)) {
                    throw new HttpException(
                      ` Estas ingresando la misma serie "${serieLabel}" para el mismo tipo de documento.`,
                      HttpStatus.BAD_REQUEST,
                    );
                  }

                  // Agregamos la serie al Set para evitar duplicados en la siguiente iteración
                  codes.add(serieLabel);

                  // Si no existe la serie, se crea
                  if (!existSerie) {
                    const createObj = this.serieRepository.create({
                      establecimiento: findEstablecimiento,
                      serie: serieLabel,
                      documento: foundDocument,
                      pos: foundPOS,
                      empresa: findEmpresa,
                    });
                    await entityManager.save(SeriesEntity, createObj);
                  } else {
                    const establishmentCode = existSerie.establecimiento.codigo;
                    const establishmentLabel =
                      establishmentCode === '0000'
                        ? 'PRINCIPAL'
                        : establishmentCode;

                    // Si la serie existe, se valida si tiene un POS asignado
                    if (!existSerie.pos) {
                      throw new HttpException(
                        `serie. La serie ${serieLabel} ya existe y no tiene asignado un POS.`,
                        HttpStatus.BAD_REQUEST,
                      );
                    }

                    // Si la serie existe, se valida si le pertenece al establecimiento
                    throw new HttpException(
                      `serie. La serie ${serieLabel} ya existe y le pertenece al establecimiento ${establishmentLabel}.`,
                      HttpStatus.BAD_REQUEST,
                    );
                  }
                }
              }
            }
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

  async migrarSeries(body: SeriesMigrateDto, userToken: QueryToken) {
    const { documentos, empresa, establecimiento, pos_destino } = body;
    const { tokenEntityFull } = userToken;

    //valida existencia y estado de la empresa
    const findEmpresa = (await this.empresaService.findOneEmpresaById(
      empresa,
      true,
    )) as EmpresaEntity;
    if (!findEmpresa.estado) {
      throw new HttpException(
        'La empresa está desactivada.',
        HttpStatus.NOT_FOUND,
      );
    }

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

    if (!findEstablecimiento.estado) {
      throw new HttpException(
        'El establecimiento está desactivado.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!idsEstablecimientosEmpresa.includes(findEstablecimiento.id)) {
      throw new HttpException(
        'El establecimiento no pertece a la empresa.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Validar la existencia del POS
    const findPosDestino = await this.posService.findPOSById(pos_destino);
    const posLabel = findPosDestino.codigo + ' - ' + findPosDestino.nombre;

    // Validar que el POS le pertenece a la empresa
    if (findPosDestino.establecimiento.empresa.id !== findEmpresa.id) {
      throw new HttpException(
        ` El POS ${posLabel} no pertenece a la empresa.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Validar que el POS le pertenece al establecimiento
    if (findPosDestino.establecimiento.id !== findEstablecimiento.id) {
      throw new HttpException(
        ` El POS ${posLabel} no pertenece al establecimiento de la empresa.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!findPosDestino.estado) {
      throw new HttpException(
        ` El POS ${posLabel} está desactivado.`,
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
                        empresa: findEmpresa,
                        pos: findPosDestino,
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

    const serie = await this.findOneSerieById(idSerie);
    if (!serie) {
      throw new HttpException('No se encontro la serie.', HttpStatus.NOT_FOUND);
    }

    if (!serie.estado) {
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
      const { empresas } = tokenEntityFull;

      const company = empresas.find(
        (item) => item.id === serie.establecimiento.empresa.id,
      );

      const isEstablishmentExisting = company.establecimientos.some(
        (item) => item.id === serie.establecimiento.id,
      );

      if (!isEstablishmentExisting) {
        throw new HttpException(
          'No puedes deshabilitar una serie que no pertece a la empresa.',
          HttpStatus.NOT_FOUND,
        );
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

    const serie = await this.findOneSerieById(idSerie);
    if (!serie) {
      throw new HttpException('No se encontro la serie.', HttpStatus.NOT_FOUND);
    }

    if (serie.estado) {
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
      const { empresas } = tokenEntityFull;

      const company = empresas.find(
        (item) => item.id === serie.establecimiento.empresa.id,
      );

      const isEstablishmentExisting = company.establecimientos.some(
        (item) => item.id === serie.establecimiento.id,
      );

      if (!isEstablishmentExisting) {
        throw new HttpException(
          'No puedes habilitar una serie que no pertece a la empresa.',
          HttpStatus.NOT_FOUND,
        );
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
          establecimiento: {
            empresa: true,
          },
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
