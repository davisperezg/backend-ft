import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TipodocsEmpresaEntity } from '../entities/tipodocs_empresa.entity';
import { DataSource, Repository } from 'typeorm';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';

@Injectable()
export class TipodocsEmpresaService {
  constructor(
    @InjectRepository(TipodocsEmpresaEntity)
    private documentRepository: Repository<TipodocsEmpresaEntity>,
    private tipodocService: TipodocsService,
    private empresaService: EmpresaService,
    private dataSource: DataSource,
  ) {}

  async getDocuments(idEmpresa: number) {
    let documents: TipodocsEmpresaEntity[];

    //Validamos si la empresa existe o no
    const getEmpresa = await this.empresaService.findOneEmpresaById(idEmpresa);

    //Si existe buscamos los documentos que tiene la empresa para emitir
    try {
      documents = await this.documentRepository.find({
        relations: {
          empresa: true,
          tipodoc: true,
        },
        where: {
          empresa: {
            id: getEmpresa.id,
          },
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al intentar listar los documentos de la empresa TipodocsEmpresaService.getDocuments.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Formateamos data para mostrar
    const formatedDocuments = documents?.map((d, i) => {
      return {
        numero: i + 1,
        id_documento: d.id,
        estado_documento: d.estado,
        id_tipo_documento: d.tipodoc.id,
        nombre_tipo_documento: d.tipodoc.tipo_documento,
        codigo_tipo_documento: d.tipodoc.codigo,
      };
    });

    const listDocuments = {
      empresa: getEmpresa.razon_social,
      cant_documentos: formatedDocuments.length,
      documentos: formatedDocuments ?? [],
    };

    return listDocuments;
  }

  async createDocument(data: any) {
    const { tipo_documentos, empresa } = data;

    //Omitiremos los numeros del array repetidos
    const setTipoDocs = new Set<number>(tipo_documentos);
    const valuesTipoDocs: number[] = [...setTipoDocs];

    //Validamos si la empresa existe o no
    const getEmpresa = await this.empresaService.findOneEmpresaById(empresa);

    //Si la empresa existe buscamos si ya tiene documentos ingresados
    const getDocumentsByEmpresa = await this.getDocuments(getEmpresa.id);

    //Si ya tiene documentos mandamos error
    if (getDocumentsByEmpresa.documentos.length > 0) {
      throw new HttpException(
        'Ya existe una empresa creada con sus respectivos documentos por favor solo modifique o edite agregando los nuevos documentos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Si la empresa no tiene documentos las creamos
    for (let index = 0; index < valuesTipoDocs.length; index++) {
      const tipo = valuesTipoDocs[index];
      const getTipoDoc = await this.tipodocService.findOneTipoDocById(tipo);

      //Si el tipo de documento esta inactivo lo omitimos y solo agregamos los activos
      if (getTipoDoc && getTipoDoc.estado) {
        const createObj = this.documentRepository.create({
          tipodoc: getTipoDoc,
          empresa: getEmpresa,
        });

        await this.documentRepository.save(createObj);
      }
    }

    //Listamos documentos ingresados a la empresa
    return await this.getDocuments(getEmpresa.id);
  }

  async updateDocument(idEmpresa: number, data: any) {
    const { tipo_documentos } = data;

    //Omitiremos los numeros del array repetidos
    const setTipoDocs = new Set<number>(tipo_documentos);
    const valuesTipoDocs: number[] = [...setTipoDocs];

    //Validamos si la empresa existe o no
    const getEmpresa = await this.empresaService.findOneEmpresaById(idEmpresa);

    //Si la empresa existe buscamos si ya tiene documentos ingresados
    const getDocumentsByEmpresa = await this.getDocuments(getEmpresa.id);

    const _queryRunner = this.dataSource.createQueryRunner();
    //Inicia transaccion
    await _queryRunner.connect();
    await _queryRunner.startTransaction();

    try {
      //Eliminamos todos los documentos que tiene la empresa
      for (
        let index = 0;
        index < getDocumentsByEmpresa.documentos.length;
        index++
      ) {
        const documento = getDocumentsByEmpresa.documentos[index];
        await this.documentRepository.delete({
          id: documento.id_documento,
        });
      }

      //Agregamos los nuevos documentos para la empresa
      for (let index = 0; index < valuesTipoDocs.length; index++) {
        const tipo = valuesTipoDocs[index];
        const getTipoDoc = await this.tipodocService.findOneTipoDocById(tipo);

        //Si el tipo de documento esta inactivo lo omitimos y solo agregamos los activos
        if (getTipoDoc && getTipoDoc.estado) {
          const createObj = this.documentRepository.create({
            empresa: getEmpresa,
            tipodoc: getTipoDoc,
          });

          await this.documentRepository.save(createObj);
        }
      }

      // Confirmar la transacción
      await _queryRunner.commitTransaction();

      return await this.getDocuments(idEmpresa);
    } catch (e) {
      // Revertir la transacción en caso de error
      await _queryRunner.rollbackTransaction();

      throw new HttpException(
        'Error al intentar actualizar los tipos de documentos de la empresa TipodocsEmpresaService.update.',
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      await _queryRunner.release(); // Liberar el queryRunner
    }
  }

  async findOneDocumentByEmpresa(idDocumento: number) {
    let tipoDocumento: TipodocsEmpresaEntity;

    try {
      tipoDocumento = await this.documentRepository.findOne({
        where: {
          id: idDocumento,
        },
      });
    } catch (e) {
      throw new HttpException(
        'Error al obtener el documento de la empresa TipodocsEmpresaService.findOneDocumentByEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!tipoDocumento) {
      throw new HttpException(
        `El documento de la empresa ID-${idDocumento} no existe.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return tipoDocumento;
  }

  async findDocumentsOfEmpresa(idDocs: number) {
    return await this.documentRepository.find({
      relations: {
        series: true,
        tipodoc: true,
        empresa: true,
      },
      where: {
        id: idDocs,
      },
    });
  }

  async findDocumentsByIdEmpresa(idEmpresa: number) {
    return await this.empresaService.findDocumentsByIdEmpresa(idEmpresa);
  }

  async allDocuments(userToken: QueryToken) {
    return await this.empresaService.listEmpresas(userToken);
  }
}
