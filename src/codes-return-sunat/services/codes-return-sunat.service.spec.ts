import { Test, TestingModule } from '@nestjs/testing';
import { CodesReturnSunatService } from './codes-return-sunat.service';

describe('CodesReturnSunatService', () => {
  let service: CodesReturnSunatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodesReturnSunatService],
    }).compile();

    service = module.get<CodesReturnSunatService>(CodesReturnSunatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
