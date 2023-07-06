import { Test, TestingModule } from '@nestjs/testing';
import { EntidadService } from './entidad.service';

describe('EntidadService', () => {
  let service: EntidadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntidadService],
    }).compile();

    service = module.get<EntidadService>(EntidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
