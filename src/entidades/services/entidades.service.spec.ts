import { Test, TestingModule } from '@nestjs/testing';
import { EntidadesService } from './entidades.service';

describe('EntidadesService', () => {
  let service: EntidadesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntidadesService],
    }).compile();

    service = module.get<EntidadesService>(EntidadesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
