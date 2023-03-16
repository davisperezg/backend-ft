import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Groupsresources,
  GroupsresourcesDocument,
} from './groups-resources/schemas/groups-resources.schema';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Groupsresources.name)
    private groupModel: Model<GroupsresourcesDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.init();
  }

  private async init() {
    await Promise.all([
      new this.groupModel({
        name: 'Usuarios',
      }).save(),
      new this.groupModel({
        name: 'Modulos',
      }).save(),
      new this.groupModel({
        name: 'Roles',
      }).save(),
      new this.groupModel({
        name: 'Desarrollador',
      }).save(),
    ]);
  }

  getHello(): string {
    return 'API funcionando correctamente!!';
  }
}
