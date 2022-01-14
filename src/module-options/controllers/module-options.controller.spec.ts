import { Test, TestingModule } from '@nestjs/testing';
import { ModuleOptionsController } from './module-options.controller';

describe('ModuleOptionsController', () => {
  let controller: ModuleOptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModuleOptionsController],
    }).compile();

    controller = module.get<ModuleOptionsController>(ModuleOptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
