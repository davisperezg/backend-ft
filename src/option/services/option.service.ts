import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Option, OptionDocument } from '../schemas/option.schema';
import { Model } from 'mongoose';

@Injectable()
export class OptionService implements OnModuleInit {
  constructor(
    @InjectModel(Option.name) private optionModel: Model<OptionDocument>,
  ) {}

  async delete_complete(id: string) {
    await this.optionModel.findByIdAndDelete(id);
  }

  async onModuleInit() {
    const count = await this.optionModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      await Promise.all([
        new this.optionModel({
          name: 'Crear',
          status: true,
        }).save(),
        new this.optionModel({
          name: 'Editar',
          status: true,
        }).save(),
        new this.optionModel({
          name: 'Eliminar',
          status: true,
        }).save(),
        new this.optionModel({
          name: 'Listar',
          status: true,
        }).save(),
      ]);
    } catch (e) {
      throw new Error(`Error en OptionService.onModuleInit ${e}`);
    }
  }

  async findAll(): Promise<Option[]> {
    return await this.optionModel.find({ status: true });
  }

  //Find options by names
  async findbyNames(name: any[]): Promise<OptionDocument[]> {
    return await this.optionModel.find({ name: { $in: name } });
  }

  //Add a single role
  async create(createOption: Option): Promise<Option> {
    //const getRole = await this.roleService.findRoleByName(String(role));
    //getModules = await this.moduleService.findbyNames(module);
    //const findModules = getModules.map((module) => module._id);

    const modifyData: Option = {
      ...createOption,
      status: true,
    };

    const createdOption = new this.optionModel(modifyData);
    return createdOption.save();
  }

  //Put a single role
  async update(id: string, bodyRole: Option): Promise<Option> {
    const { status } = bodyRole;

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

    return await this.optionModel.findByIdAndUpdate(id, bodyRole, {
      new: true,
    });
  }
}
