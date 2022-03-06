import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesRolesService } from './resources-roles.service';

describe('ResourcesRolesService', () => {
  let service: ResourcesRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourcesRolesService],
    }).compile();

    service = module.get<ResourcesRolesService>(ResourcesRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
