import { Test, TestingModule } from '@nestjs/testing';
import { NotaVentaController } from './nota-venta.controller';

describe('NotaVentaController', () => {
  let controller: NotaVentaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotaVentaController],
    }).compile();

    controller = module.get<NotaVentaController>(NotaVentaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
