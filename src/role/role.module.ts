import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Resource_Role,
  Resource_RoleSchema,
} from 'src/resources-roles/schemas/resources-role';
import {
  Resource_User,
  Resource_UserSchema,
} from 'src/resources-users/schemas/resources-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { RoleController } from './controllers/role.controller';
import { Role, RoleSchema } from './schemas/role.schema';
import { RoleService } from './services/role.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
    ]),
  ],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
