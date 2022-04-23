import {
  Services_User,
  ServicesUserSchema,
} from './../services-users/schemas/services-user';
import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from 'src/role/services/role.service';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import {
  Resource_RoleSchema,
  Resource_Role,
} from 'src/resources-roles/schemas/resources-role';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, RoleService],
})
export class UserModule {}
