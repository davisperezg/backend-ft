import { Test, TestingModule } from '@nestjs/testing';
import { TipodocsEmpresaService } from './tipodocs_empresa.service';

describe('TipodocsEmpresaService', () => {
  let service: TipodocsEmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipodocsEmpresaService],
    }).compile();

    service = module.get<TipodocsEmpresaService>(TipodocsEmpresaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
