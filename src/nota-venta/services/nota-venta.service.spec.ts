import { Test, TestingModule } from '@nestjs/testing';
import { NotaVentaService } from './nota-venta.service';

describe('NotaVentaService', () => {
  let service: NotaVentaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotaVentaService],
    }).compile();

    service = module.get<NotaVentaService>(NotaVentaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
