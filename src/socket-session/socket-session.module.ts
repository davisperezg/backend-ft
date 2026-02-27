import { Module, Global } from '@nestjs/common';
import { InvoiceSocketService } from './services/invoice-socket.service';
import { NotaVentaSocketService } from './services/notaVenta-socket.service';

@Global()
@Module({
  providers: [InvoiceSocketService, NotaVentaSocketService],
  exports: [InvoiceSocketService, NotaVentaSocketService],
})
export class SocketSessionModule {}
