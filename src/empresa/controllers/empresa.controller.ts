import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { EmpresaService } from '../services/empresa.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { CreateEmpresaDTO } from '../dto/create-empresa.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

//base: http://localhost:3000/api/v1/empresas
@Controller('api/v1/empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  //Get Empresas: http://localhost:3000/api/v1/empresas
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadEmpresas))
  async getEmpresas(@CtxUser() user: QueryToken) {
    return await this.empresaService.listEmpresas(user);
  }

  //Add Empresa(POST): http://localhost:3000/api/v1/empresas
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateEmpresas))
  async createEmpresa(
    @Res() res,
    // @UploadedFiles()
    // files: {
    //   logo?: Express.Multer.File[];
    //   certificado?: Express.Multer.File[];
    // },
    @Body('data')
    createBody: string,
  ) {
    const parsedData: CreateEmpresaDTO = JSON.parse(createBody);
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
      //   files: {
      //     logo: files.logo ? files.logo[0] : undefined,
      //     certificado: files.certificado ? files.certificado[0] : undefined,
      //   },
    };

    const response = await this.empresaService.createEmpresa(body);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido creada éxitosamente.',
      response,
    });
  }

  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.DesactivateEmpresas))
  async desactEmpresa(@Res() res, @Param('id') id: number) {
    const response = await this.empresaService.desactivateEmpresa(id);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido desactivada correctamente.',
      response,
    });
  }

  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.RestoreEmpresas))
  async activEmpresa(@Res() res, @Param('id') id: number) {
    const response = await this.empresaService.activateEmpresa(id);
    return res.status(HttpStatus.OK).json({
      message: 'La empresa ha sido activada correctamente.',
      response,
    });
  }
}
