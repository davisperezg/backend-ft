import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { Model } from 'mongoose';
import { QueryToken } from 'src/auth/dto/queryToken';

@Injectable()
export class MenuService {
  constructor(@InjectModel(Menu.name) private menuModel: Model<MenuDocument>) {}

  async create(createMenu: Menu, user: QueryToken): Promise<Menu> {
    const { tokenEntityFull } = user;

    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const { link } = createMenu;
    const modifyData = {
      ...createMenu,
      link: link.toLowerCase(),
      status: true,
    };

    const createdMenu = new this.menuModel(modifyData);
    return createdMenu.save();
  }

  //Put
  async update(id: string, bodyMenu: Menu, user: QueryToken): Promise<Menu> {
    const { tokenEntityFull } = user;
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { status } = bodyMenu;

    if (status) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return await this.menuModel.findByIdAndUpdate(id, bodyMenu, { new: true });
  }

  //Delete
  async delete(id: string, user: QueryToken): Promise<boolean> {
    const { tokenEntityFull } = user;
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
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
      await this.menuModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      throw new Error(`Error en MenuService.delete ${e}`);
    }

    return result;
  }

  async findAll(): Promise<Menu[]> {
    return await this.menuModel.find({ status: true }).exec();
  }

  async findbyName(name: any[]): Promise<any[]> {
    return await this.menuModel.find({ name: { $in: name } });
  }

  //Restore
  async restore(id: string, user: QueryToken): Promise<boolean> {
    const { tokenEntityFull } = user;
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
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
      await this.menuModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      throw new Error(`Error en MenuService.restore ${e}`);
    }

    return result;
  }
}
