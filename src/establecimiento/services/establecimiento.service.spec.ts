import { Test, TestingModule } from '@nestjs/testing';
import { EstablecimientoService } from './establecimiento.service';

describe('EstablecimientoService', () => {
  let service: EstablecimientoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EstablecimientoService],
    }).compile();

    service = module.get<EstablecimientoService>(EstablecimientoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
