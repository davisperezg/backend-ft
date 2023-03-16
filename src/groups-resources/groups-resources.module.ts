import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsResourceController } from './controllers/groups-resources.controller';
import {
  Groupsresources,
  GroupsresourcesSchema,
} from './schemas/groups-resources.schema';
import { GroupsResourceService } from './services/groups-resources.services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Groupsresources.name, schema: GroupsresourcesSchema },
    ]),
  ],
  providers: [GroupsResourceService],
  controllers: [GroupsResourceController],
})
export class GroupsResourceModule {}
