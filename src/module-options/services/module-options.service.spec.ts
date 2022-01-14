import { Test, TestingModule } from '@nestjs/testing';
import { ModuleOptionsService } from './module-options.service';

describe('ModuleOptionsService', () => {
  let service: ModuleOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModuleOptionsService],
    }).compile();

    service = module.get<ModuleOptionsService>(ModuleOptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
