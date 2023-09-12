import { Test, TestingModule } from '@nestjs/testing';
import { TipodocsController } from './tipodocs.controller';

describe('TipodocsController', () => {
  let controller: TipodocsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipodocsController],
    }).compile();

    controller = module.get<TipodocsController>(TipodocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
