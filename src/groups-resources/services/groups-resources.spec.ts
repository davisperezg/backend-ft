import { Test, TestingModule } from '@nestjs/testing';
import { GroupsResourceService } from './groups-resources.services';

describe('GroupsResourceService', () => {
  let service: GroupsResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupsResourceService],
    }).compile();

    service = module.get<GroupsResourceService>(GroupsResourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
