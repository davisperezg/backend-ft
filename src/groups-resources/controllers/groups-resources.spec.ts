import { Test, TestingModule } from '@nestjs/testing';
import { GroupsResourceController } from './groups-resources.controller';

describe('GroupsResourceController', () => {
  let controller: GroupsResourceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsResourceController],
    }).compile();

    controller = module.get<GroupsResourceController>(GroupsResourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
