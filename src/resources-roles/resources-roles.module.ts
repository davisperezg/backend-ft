import {
  Resource_User,
  Resource_UserSchema,
} from './../resources-users/schemas/resources-user';
import { Module } from '@nestjs/common';
import { ResourcesRolesService } from './services/resources-roles.service';
import { ResourcesRolesController } from './controllers/resources-roles.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource_Role, Resource_RoleSchema } from './schemas/resources-role';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { Resource, ResourceSchema } from 'src/resource/schemas/resource.schema';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import {
  CopyResource_User,
  CopyResource_UserSchema,
} from 'src/resources-users/schemas/cp-resource-user';
import {
  ServicesUserSchema,
  Services_User,
} from 'src/services-users/schemas/services-user';
import {
  CopyServicesSchema,
  CopyServices_User,
} from 'src/services-users/schemas/cp-services-user';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource_Role.name, schema: Resource_RoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Resource_User.name, schema: Resource_UserSchema },
      { name: User.name, schema: UserSchema },
      { name: CopyResource_User.name, schema: CopyResource_UserSchema },
      { name: Services_User.name, schema: ServicesUserSchema },
      { name: CopyServices_User.name, schema: CopyServicesSchema },
    ]),
  ],
  providers: [ResourcesRolesService, RoleService, ResourceService],
  controllers: [ResourcesRolesController],
})
export class ResourcesRolesModule {}
