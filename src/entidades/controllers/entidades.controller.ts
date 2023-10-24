import { Controller, Get, Param } from '@nestjs/common';
import { EntidadesService } from '../services/entidades.service';

@Controller('api/v1/entidades')
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Get('/departamentos')
  getDepartamentos() {
    return this.entidadesService.getDepartamentos();
  }

  @Get('/provincias')
  getProvincias() {
    return this.entidadesService.getProvincias();
  }

  @Get('/distritos')
  getDistritos() {
    return this.entidadesService.getDistritos();
  }

  @Get('/provincias/departamento/:id')
  getProvinciasByDepartamento(@Param('id') idDepartamento: string) {
    console.log(idDepartamento);
    return this.entidadesService.getProvinciasByDepartamento(idDepartamento);
  }

  @Get('/distritos/provincia/:id')
  getDistritosByProvincias(@Param('id') idProvincia: string) {
    return this.entidadesService.getDistritosByProvincia(idProvincia);
  }
}
