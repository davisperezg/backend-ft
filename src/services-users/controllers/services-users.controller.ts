import { Controller } from '@nestjs/common';
import { ServicesUsersService } from '../services/services-users.service';

@Controller('api/v1/services-users')
export class ServicesUsersController {
  constructor(private readonly suService: ServicesUsersService) {}
}
