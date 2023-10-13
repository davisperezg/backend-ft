import { Test, TestingModule } from '@nestjs/testing';
import { EntidadesController } from './entidades.controller';

describe('EntidadesController', () => {
  let controller: EntidadesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntidadesController],
    }).compile();

    controller = module.get<EntidadesController>(EntidadesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
