import { Module } from '@nestjs/common';
import { ServicesUsersService } from './services/services-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicesUserSchema, Services_User } from './schemas/services-user';
import { ServicesUsersController } from './controllers/services-users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Services_User.name, schema: ServicesUserSchema },
    ]),
  ],
  providers: [ServicesUsersService],
  controllers: [ServicesUsersController],
})
export class ServicesUsersModule {}
