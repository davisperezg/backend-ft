import { Test, TestingModule } from '@nestjs/testing';
import { EstablecimientoController } from './establecimiento.controller';

describe('EstablecimientoController', () => {
  let controller: EstablecimientoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablecimientoController],
    }).compile();

    controller = module.get<EstablecimientoController>(EstablecimientoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
