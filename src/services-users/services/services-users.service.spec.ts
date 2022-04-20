import { Test, TestingModule } from '@nestjs/testing';
import { ServicesUsersService } from './services-users.service';

describe('ServicesUsersService', () => {
  let service: ServicesUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServicesUsersService],
    }).compile();

    service = module.get<ServicesUsersService>(ServicesUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
