import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesUsersController } from './resources-users.controller';

describe('ResourcesUsersController', () => {
  let controller: ResourcesUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesUsersController],
    }).compile();

    controller = module.get<ResourcesUsersController>(ResourcesUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
