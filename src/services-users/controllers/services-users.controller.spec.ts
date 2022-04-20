import { Test, TestingModule } from '@nestjs/testing';
import { ServicesUsersController } from './services-users.controller';

describe('ServicesUsersController', () => {
  let controller: ServicesUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesUsersController],
    }).compile();

    controller = module.get<ServicesUsersController>(ServicesUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
