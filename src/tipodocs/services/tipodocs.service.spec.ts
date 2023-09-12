import { Test, TestingModule } from '@nestjs/testing';
import { TipodocsService } from './tipodocs.service';

describe('TipodocsService', () => {
  let service: TipodocsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipodocsService],
    }).compile();

    service = module.get<TipodocsService>(TipodocsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
