import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TipodocsEmpresaEntity } from '../entities/tipodocs_empresa.entity';
import { Equal, Repository } from 'typeorm';
import { TipodocsService } from 'src/tipodocs/services/tipodocs.service';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';

@Injectable()
export class TipodocsEmpresaService {
  constructor(
    @InjectRepository(TipodocsEmpresaEntity)
    private documentRepository: Repository<TipodocsEmpresaEntity>,
    private tipodocService: TipodocsService,
    private empresaService: EmpresaService,
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

  async activateDocument(documentId: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    const documento = await this.documentRepository.findOne({
      relations: {
        empresa: true,
      },
      where: {
        id: Equal(documentId),
      },
    });

    if (!documento) {
      throw new HttpException(
        'El documento no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (documento.estado) {
      throw new HttpException(
        'El documento ya se encuentra activado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        const res = await this.documentRepository
          .createQueryBuilder()
          .update(TipodocsEmpresaEntity)
          .set({
            estado: true,
          })
          .where('id =:id', { id: documentId })
          .execute();

        return res;
      } catch (e) {
        throw new HttpException(
          'Error al activar el documento de la empresa TipodocsEmpresaService.desactivateDocument.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //Solo es permitido desactivar documentos por el usuario padre y sus hijos
      const companys = tokenEntityFull.empresas;

      if (companys) {
        const company = companys.find(
          (item) => item.id === documento.empresa.id,
        );
        const documents = await this.findDocumentsByIdEmpresa(company.id);
        const documentsIds = documents.tipodoc_empresa.map((d) => d.id);

        if (!documentsIds.includes(documento.id)) {
          throw new HttpException(
            'Solo puedes activar documentos de la empresa a la que pertecences.',
            HttpStatus.BAD_REQUEST,
          );
        } else {
          try {
            return await this.documentRepository
              .createQueryBuilder()
              .update(TipodocsEmpresaEntity)
              .set({
                estado: true,
              })
              .where('id =:id', { id: documentId })
              .execute();
          } catch (e) {
            throw new HttpException(
              'Error al activar el documento de la empresa TipodocsEmpresaService.desactivateDocument.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      } else {
        throw new HttpException(
          'No puedes activar un documento ya que no estas asignado a una empresa.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async desactivateDocument(documentId: number, userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    const documento = await this.documentRepository.findOne({
      relations: {
        empresa: true,
      },
      where: {
        id: Equal(documentId),
      },
    });

    if (!documento) {
      throw new HttpException(
        'El documento no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!documento.estado) {
      throw new HttpException(
        'El documento ya se encuentra desactivado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        const res = await this.documentRepository
          .createQueryBuilder()
          .update(TipodocsEmpresaEntity)
          .set({
            estado: false,
          })
          .where('id =:id', { id: documentId })
          .execute();

        return res;
      } catch (e) {
        throw new HttpException(
          'Error al desactivar el documento de la empresa TipodocsEmpresaService.desactivateDocument.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //Solo es permitido desactivar documentos por el usuario padre y sus hijos
      const companys = tokenEntityFull.empresas;

      if (companys) {
        const company = companys.find(
          (item) => item.id === documento.empresa.id,
        );
        const documents = await this.findDocumentsByIdEmpresa(company.id);
        const documentsIds = documents.tipodoc_empresa.map((d) => d.id);

        if (!documentsIds.includes(documento.id)) {
          throw new HttpException(
            'Solo puedes desactivar documentos de la empresa a la que pertecences.',
            HttpStatus.BAD_REQUEST,
          );
        } else {
          try {
            return await this.documentRepository
              .createQueryBuilder()
              .update(TipodocsEmpresaEntity)
              .set({
                estado: false,
              })
              .where('id =:id', { id: documentId })
              .execute();
          } catch (e) {
            throw new HttpException(
              'Error al desactivar el documento de la empresa TipodocsEmpresaService.desactivateDocument.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      } else {
        throw new HttpException(
          'No puedes desactivar un documento ya que no estas asignado a una empresa.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async findOneDocumentByIdAndIdEmpresa(
    idDocumento: number,
    idEmpresa: number,
  ) {
    let tipoDocumento: TipodocsEmpresaEntity;

    try {
      tipoDocumento = await this.documentRepository.findOne({
        relations: {
          tipodoc: true,
          empresa: true,
        },
        where: {
          id: idDocumento,
          empresa: {
            id: idEmpresa,
          },
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
        `El documento #${idDocumento} de la empresa no existe.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!tipoDocumento.estado) {
      throw new HttpException(
        `El documento ${tipoDocumento.tipodoc.tipo_documento} está desactivado.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return tipoDocumento;
  }

  async findAllDocumentsById(idDocs: number) {
    return await this.documentRepository.find({
      relations: {
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

  async allDocuments(userToken: QueryToken, front: boolean) {
    return await this.empresaService.listEmpresas(userToken, front);
  }
}
