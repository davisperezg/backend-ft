import { Module, Global } from '@nestjs/common';
import { InvoiceSocketService } from './services/invoice-socket.service';

@Global()
@Module({
  providers: [InvoiceSocketService],
  exports: [InvoiceSocketService],
})
export class SocketSessionModule {}
