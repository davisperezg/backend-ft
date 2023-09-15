import PermissionGuard from 'src/lib/guards/resources.guard';
import { SeriesService } from '../services/series.service';
import {
  Controller,
  Get,
  UseGuards,
  Res,
  Patch,
  Param,
  HttpStatus,
  Post,
  Body,
  Put,
  ParseArrayPipe,
} from '@nestjs/common';
import Permission from 'src/lib/type/permission.type';
import { SeriesUpdateDto } from '../dto/series-update.dto';
import { SeriesCreateDto } from '../dto/series-create.dto';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { QueryToken } from 'src/auth/dto/queryToken';

@Controller('api/v1/series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  //Get Series: http://localhost:3000/api/v1/series
  @Get()
  @UseGuards(PermissionGuard(Permission.ReadSeries))
  async getSeries(@CtxUser() user: QueryToken) {
    return await this.seriesService.allSeries(user);
  }

  //Get Series: http://localhost:3000/api/v1/series/empresa/1
  @Get('/empresa/:id')
  @UseGuards(PermissionGuard(Permission.ReadSeries))
  async getSeriesByEmpresa(@Param('id') id: number) {
    return await this.seriesService.listSeriesByIdEmpresa(id);
  }

  //Add Series(POST): http://localhost:3000/api/v1/series
  @Post()
  @UseGuards(PermissionGuard(Permission.CreateSeries))
  async createSerie(
    @Res() res,
    @Body(new ParseArrayPipe({ items: SeriesCreateDto, whitelist: true }))
    create: SeriesCreateDto[],
  ) {
    //console.log(items);
    await this.seriesService.createSeries(create);
    const response = await this.seriesService.findSeriesByDoc(create);
    return res.status(HttpStatus.OK).json({
      message: 'La serie ha sido creado éxitosamente.',
      response,
    });
  }

  //Update Series(PUT): http://localhost:3000/api/v1/series/1
  @Put(':id')
  @UseGuards(PermissionGuard(Permission.UpdateSeries))
  async updateSerie(
    @Res() res,
    @Param('id') id: number,
    @Body()
    update: SeriesUpdateDto,
  ) {
    const response = await this.seriesService.updateSeries(id, update);
    return res.status(HttpStatus.OK).json({
      message: 'La serie ha sido actualizado éxitosamente.',
      response,
    });
  }

  //Patch Series: http://localhost:3000/api/v1/series/disable/1
  @Patch('/disable/:id')
  @UseGuards(PermissionGuard(Permission.DesactivateSeries))
  async desactSerie(@Res() res, @Param('id') id: number) {
    const response = await this.seriesService.disableSeries(id);
    return res.status(HttpStatus.OK).json({
      message: 'La serie ha sido desactivado correctamente.',
      response,
    });
  }

  //Patch Series: http://localhost:3000/api/v1/series/enable/1
  @Patch('/enable/:id')
  @UseGuards(PermissionGuard(Permission.RestoreSeries))
  async activSerie(@Res() res, @Param('id') id: number) {
    const response = await this.seriesService.enableSeries(id);
    return res.status(HttpStatus.OK).json({
      message: 'La serie ha sido activada correctamente.',
      response,
    });
  }
}
