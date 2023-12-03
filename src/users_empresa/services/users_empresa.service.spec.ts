import { Test, TestingModule } from '@nestjs/testing';
import { UsersEmpresaService } from './users_empresa.service';

describe('UsersEmpresaService', () => {
  let service: UsersEmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersEmpresaService],
    }).compile();

    service = module.get<UsersEmpresaService>(UsersEmpresaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
