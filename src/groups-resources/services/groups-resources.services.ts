import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Groupsresources,
  GroupsresourcesDocument,
} from '../schemas/groups-resources.schema';
import { Model } from 'mongoose';

@Injectable()
export class GroupsResourceService {
  constructor(
    @InjectModel(Groupsresources.name)
    private groupModel: Model<GroupsresourcesDocument>,
  ) {}

  async create(createMenu: any) {
    return new this.groupModel(createMenu).save();
  }

  //Put
  async update(id: string, bodyMenu: any) {
    return await this.groupModel.findByIdAndUpdate(id, bodyMenu, { new: true });
  }

  //Delete
  async delete(id: string, user: any): Promise<boolean> {
    const { findUser } = user;
    if (findUser.role !== ROL_PRINCIPAL) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let result = false;

    try {
      await this.groupModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      throw new Error(`Error en MenuService.delete ${e}`);
    }

    return result;
  }

  async findAll() {
    return await this.groupModel.find({ status: true }).exec();
  }

  //Restore
  async restore(id: string, user: any): Promise<boolean> {
    const { findUser } = user;
    if (findUser.role !== ROL_PRINCIPAL) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let result = false;

    try {
      await this.groupModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      throw new Error(`Error en MenuService.restore ${e}`);
    }

    return result;
  }
}
