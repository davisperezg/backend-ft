import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Groupsresources,
  GroupsresourcesDocument,
} from './groups-resources/schemas/groups-resources.schema';
import {
  CATEGORIA_1,
  CATEGORIA_2,
  CATEGORIA_3,
  CATEGORIA_4,
  RECURSOS_DEFECTOS,
} from './lib/const/consts';
import { Resource } from './resource/schemas/resource.schema';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Groupsresources.name)
    private groupModel: Model<GroupsresourcesDocument>,
    @InjectModel(Resource.name)
    private resourceModel: Model<Resource>,
  ) {}

  async onApplicationBootstrap() {
    await this.init();
  }

  private async init() {
    //Evitamos doble registro
    const count = await this.resourceModel.estimatedDocumentCount();
    if (count > 0) return;

    //Crea las categorias por defecto
    await Promise.all([
      new this.groupModel({
        name: CATEGORIA_1,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_2,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_3,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_4,
      }).save(),
    ]);

    //Busca todas las categorias ingresadas
    const categorys = await this.groupModel.find();

    //Recorremos los recursos defatuls con las categorias insertadas para obtener las id
    const mapped = RECURSOS_DEFECTOS.map((obj) => {
      const item = categorys.find((cat) => cat.name === obj.group_resource);
      return item ? { ...obj, group_resource: item._id } : obj;
    });

    await this.resourceModel.insertMany(mapped);
  }

  getHello(): string {
    return 'API funcionando correctamente!!';
  }
}
