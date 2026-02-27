import {
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotaVentaService } from '../services/nota-venta.service';
import PermissionGuard from 'src/lib/guards/resources.guard';
import Permission from 'src/lib/type/permission.type';
import { CtxUser } from 'src/lib/decorators/ctx-user.decorators';
import { QueryToken } from 'src/auth/dto/queryToken';

@Controller('api/v1/nota-venta')
export class NotaVentaController {
  constructor(private readonly notaVentaService: NotaVentaService) {}

  @Delete(':id')
  @UseGuards(PermissionGuard(Permission.AnularNotaVentas))
  async anularNotaVenta(
    @Param('id', ParseIntPipe) id: number,
    @CtxUser() user: QueryToken,
  ) {
    return await this.notaVentaService.anularNotaVenta(id, user);
  }
}
