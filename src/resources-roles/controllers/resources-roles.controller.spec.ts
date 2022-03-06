import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesRolesController } from './resources-roles.controller';

describe('ResourcesRolesController', () => {
  let controller: ResourcesRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesRolesController],
    }).compile();

    controller = module.get<ResourcesRolesController>(ResourcesRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
