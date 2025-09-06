import { Test, TestingModule } from '@nestjs/testing';
import { SunatService } from './sunat.service';

describe('SunatService', () => {
  let service: SunatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SunatService],
    }).compile();

    service = module.get<SunatService>(SunatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
