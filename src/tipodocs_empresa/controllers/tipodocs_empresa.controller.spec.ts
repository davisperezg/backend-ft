import { Test, TestingModule } from '@nestjs/testing';
import { TipodocsEmpresaController } from './tipodocs_empresa.controller';

describe('TipodocsEmpresaController', () => {
  let controller: TipodocsEmpresaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipodocsEmpresaController],
    }).compile();

    controller = module.get<TipodocsEmpresaController>(TipodocsEmpresaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
