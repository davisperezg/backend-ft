import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceSocketService {
  private socketMap: Map<number, string> = new Map(); // invoiceId -> socketId

  getAllSockets(): { invoiceId: number; socketId: string }[] {
    return Array.from(this.socketMap.entries()).map(
      ([invoiceId, socketId]) => ({
        invoiceId,
        socketId,
      }),
    );
  }

  setSocket(invoiceId: number, socketId: string) {
    return this.socketMap.set(invoiceId, socketId);
  }

  getSocket(invoiceId: number): string | undefined {
    return this.socketMap.get(invoiceId);
  }

  deleteSocket(invoiceId: number) {
    return this.socketMap.delete(invoiceId);
  }
}
