import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { InvoiceController } from './controllers/invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { EmpresaModule } from 'src/empresa/empresa.module';
import { EstablecimientoModule } from 'src/establecimiento/establecimiento.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity]),
    EmpresaModule,
    EstablecimientoModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
