import { ModuleOptions } from 'src/module-options/schemas/module-options.schema';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ModuleService } from 'src/module/services/module.service';
import { OptionService } from 'src/option/services/option.service';
import { RoleService } from 'src/role/services/role.service';
import { ModuleOptionsDocument } from '../schemas/module-options.schema';

@Injectable()
export class ModuleOptionsService {
  constructor(
    @InjectModel('ModuleOptions')
    private optionModel: Model<ModuleOptionsDocument>,
    private readonly moduleService: ModuleService,
    private readonly optionService: OptionService,
    private readonly roleService: RoleService,
  ) {}

  //Add a single mo
  async create(createBody: ModuleOptions): Promise<ModuleOptions> {
    const { module, role } = createBody;

    const getRole = await this.roleService.findRoleByName(String(role));
    const getModule = await this.moduleService.findbyName(String(module));
    //const findModules = getModules.map((module) => module._id);

    //const getOptions = await this.optionService.findbyNames(option);
    //const findOptions = getOptions.map((option) => option._id);

    const modifyData: ModuleOptions = {
      ...createBody,
      status: true,
      role: getRole._id,
      module: getModule._id,
    };

    const createdMO = new this.optionModel(modifyData);
    return createdMO.save();
  }

  async findAll(): Promise<ModuleOptions[]> {
    return await this.optionModel
      .find({ status: true })
      .populate([{ path: 'module' }]);
  }

  async delete_complete(id: string) {
    await this.optionModel.findByIdAndDelete(id);
  }

  //Find options by names
  async findbyNames(name: any[]): Promise<ModuleOptionsDocument[]> {
    return await this.optionModel.find({ name: { $in: name } });
  }

  //Find options by name
  async findbyName(name: string): Promise<ModuleOptionsDocument> {
    return await this.optionModel.findOne({ name });
  }

  //Find OptionsByRolAndModule
  async findOptionsByRolAndModule(
    role: string,
    //module: string,
  ): Promise<ModuleOptionsDocument[]> {
    const getRole = await this.roleService.findRoleByName(String(role));
    //const getModule = await this.moduleService.findbyName(String(module));
    return await this.optionModel
      .find({
        role: getRole._id,
      })
      .populate({
        path: 'module',
      });
  }

  //Put a single role
  async update(id: string, bodyOption: ModuleOptions): Promise<ModuleOptions> {
    const { status, role, module } = bodyOption;

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

    const getRole = await this.roleService.findRoleByName(String(role));
    const getModule = await this.moduleService.findbyName(String(module));
    //const findModules = getModules.map((module) => module._id);

    //const getOptions = await this.optionService.findbyNames(option);
    //const findOptions = getOptions.map((option) => option._id);

    const modifyData: ModuleOptions = {
      ...bodyOption,
      role: getRole._id,
      module: getModule._id,
    };

    return await this.optionModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }
}
