import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EmpresaService } from '../services/empresa.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { CreateEmpresaDTO, CreateFormDTO } from '../dto/create-empresa.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Express, Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateEmpresaDTO, UpdateFormDTO } from '../dto/update-empresa.dto';

//base: http://localhost:3000/api/v1/empresas
@Controller('api/v1/empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  //Get Empresas: http://localhost:3000/api/v1/empresas
  @Get()
  @UseGuards(
    PermissionGuard([Permission.ReadEmpresas, Permission.CreateSeries]),
  )
  async getEmpresas(@CtxUser() user: QueryToken) {
    return await this.empresaService.listEmpresas(user);
  }

  @Get(':id/documentos')
  @UseGuards(PermissionGuard(Permission.CreateSeries))
  async getDocumentosByEmpresa(@Param('id') id: number) {
    const documentos = await this.empresaService.findDocumentsByIdEmpresa(id);
    const response =
      documentos?.tipodoc_empresa.map((a) => {
        return {
          id: a.id,
          estado: a.estado,
          nombre: a.tipodoc.tipo_documento,
        };
      }) || [];

    return response;
  }

  @Get(':id')
  @UseGuards(
    PermissionGuard([Permission.GetOneEmpresas, Permission.UpdateEmpresas]),
  )
  async getEmpresa(@Res() res, @Param('id') id: number, @Req() req: Request) {
    const response = await this.empresaService.findOneEmpresaByIdx(
      id,
      false,
      req,
    );
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido obtenida correctamente.',
      response,
    });
  }

  @Get(':id/establecimientos')
  @UseGuards(PermissionGuard(Permission.CreateSeries))
  async getEstablecimientos(@Param('id') id: number) {
    return await this.empresaService.findEstablecimientosByEmpresa(id);
  }

  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateEmpresas))
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'logo' }, { name: 'certificado' }, { name: 'establecimientos' }],
      {
        fileFilter: (
          req: Express.Request,
          file: Express.Multer.File,
          callback: (error: Error | null, acceptFile: boolean) => void,
        ) => {
          const fileExtension = file.mimetype.split('/')[1];
          //const validFiles = ['png', 'x-pkcs12'];

          if (
            (file.fieldname === 'logo' && fileExtension.includes('png')) ||
            (file.fieldname === 'certificado' &&
              fileExtension.includes('x-pkcs12')) ||
            (file.fieldname === 'establecimientos' &&
              fileExtension.includes('png'))
          ) {
            return callback(null, true);
          }
          return callback(
            new HttpException(
              `El ${file.fieldname} no es un archivo válido.`,
              HttpStatus.UNPROCESSABLE_ENTITY,
            ),
            false,
          );
        },
      },
    ),
  )
  //@UseInterceptors(AnyFilesInterceptor())
  async updateEmpresa(
    @Res() res,
    @Param('id') id: number,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      certificado?: Express.Multer.File[];
      establecimientos?: Express.Multer.File[];
    },
    //@UploadedFiles() files_establecimientos: Array<Express.Multer.File>,
    @Body()
    createBody: UpdateFormDTO,
  ) {
    if (
      files &&
      ((files.logo?.length ?? 0) > 1 || (files.certificado?.length ?? 0) > 1)
    ) {
      throw new HttpException(
        'El logo y/o certificado solo deben contener un archivo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedData = JSON.parse(createBody.data);
    const myDto = plainToClass(UpdateEmpresaDTO, parsedData);
    const errors = await validate(myDto, {
      forbidNonWhitelisted: true, // Evita propiedades adicionales no especificadas en la clase
      whitelist: true, // Ignora las propiedades no decoradas con @IsString, @IsNotEmpty, etc.
    });

    if (errors.length > 0) {
      const constraints = errors.map((a) =>
        Object.keys(a.constraints).find((b) => b === 'whitelistValidation')
          ? `[${a.property.toUpperCase()}] no es válido`
          : Object.values(a.constraints)[0],
      );
      return res.status(400).json({
        statusCode: 400,
        message: constraints,
      });
    }

    const body = {
      data: parsedData,
      files: {
        logo: files.logo ? files.logo[0] : null,
        certificado: files.certificado ? files.certificado[0] : null,
        establecimientos: files.establecimientos
          ? files.establecimientos
          : null,
      },
    };

    const response = await this.empresaService.updateEmpresa(id, body);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido actualizada correctamente.',
      response,
    });
  }

  //Add Empresa(POST): http://localhost:3000/api/v1/empresas
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'logo' }, { name: 'certificado' }], {
      fileFilter: (
        req: Express.Request,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const fileExtension = file.mimetype.split('/')[1];
        //const validFiles = ['png', 'x-pkcs12'];
        if (
          (file.fieldname === 'logo' && fileExtension.includes('png')) ||
          (file.fieldname === 'certificado' &&
            fileExtension.includes('x-pkcs12'))
        ) {
          return callback(null, true);
        }
        return callback(
          new HttpException(
            `El ${file.fieldname} no es un archivo válido.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          ),
          false,
        );
      },
    }),
  )
  async createEmpresa(
    @Res() res,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      certificado?: Express.Multer.File[];
    },
    @Body()
    createBody: CreateFormDTO,
  ) {
    if (
      files &&
      ((files.logo?.length ?? 0) > 1 || (files.certificado?.length ?? 0) > 1)
    ) {
      throw new HttpException(
        'El logo y/o certificado solo deben contener un archivo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedData: CreateEmpresaDTO = JSON.parse(createBody.data);
    const myDto = plainToClass(CreateEmpresaDTO, parsedData);
    const errors = await validate(myDto);

    if (errors.length > 0) {
      const constraints = errors.map((a) =>
        Object.keys(a.constraints).find((b) => b === 'whitelistValidation')
          ? `[${a.property.toUpperCase()}] no es válido`
          : Object.values(a.constraints)[0],
      );
      return res.status(400).json({
        statusCode: 400,
        message: constraints,
      });
    }

    const body = {
      data: parsedData,
      files: {
        logo: files.logo ? files.logo[0] : null,
        certificado: files.certificado ? files.certificado[0] : null,
      },
    };

    const response = await this.empresaService.createEmpresa(body);

    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido creada éxitosamente.',
      response,
    });
  }

  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.DesactivateEmpresas))
  async desactEmpresa(
    @Res() res,
    @Param('id') id: number,
    @CtxUser() user: QueryToken,
  ) {
    const response = await this.empresaService.desactivateEmpresa(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido desactivada correctamente.',
      response,
    });
  }

  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.RestoreEmpresas))
  async activEmpresa(
    @Res() res,
    @Param('id') id: number,
    @CtxUser() user: QueryToken,
  ) {
    const response = await this.empresaService.activateEmpresa(id, user);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido activada correctamente.',
      response,
    });
  }
}
