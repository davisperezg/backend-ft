import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesUsersService } from './resources-users.service';

describe('ResourcesUsersService', () => {
  let service: ResourcesUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourcesUsersService],
    }).compile();

    service = module.get<ResourcesUsersService>(ResourcesUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
