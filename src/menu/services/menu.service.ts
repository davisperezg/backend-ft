import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Menu, MenuDocument } from '../schemas/menu.schema';
import { Model } from 'mongoose';

@Injectable()
export class MenuService implements OnModuleInit {
  constructor(@InjectModel(Menu.name) private menuModel: Model<MenuDocument>) {}

  async onModuleInit() {
    const count = await this.menuModel.estimatedDocumentCount();
    if (count > 0) return;

    try {
      //await this.menuModel.updateMany({ status: null }, { status: true });

      await Promise.all([
        new this.menuModel({
          name: 'Usuarios',
          status: true,
          link: 'usuarios',
        }).save(),
        new this.menuModel({
          name: 'Roles',
          status: true,
          link: 'roles',
        }).save(),
        new this.menuModel({
          name: 'Modulos',
          status: true,
          link: 'modulos',
        }).save(),
        new this.menuModel({
          name: 'Permisos',
          status: true,
          link: 'permisos',
        }).save(),
      ]);
    } catch (e) {
      throw new Error(`Error en MenuService.onModuleInit ${e}`);
    }
  }

  async create(createMenu: Menu, user: any): Promise<Menu> {
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
  async update(id: string, bodyMenu: Menu, user: any): Promise<Menu> {
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
      await this.menuModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      throw new Error(`Error en MenuService.restore ${e}`);
    }

    return result;
  }
}
