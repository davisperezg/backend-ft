import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ModuleService } from 'src/module/services/module.service';
import { Role, RoleDocument } from '../schemas/role.schema';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private readonly moduleService: ModuleService,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleModel.find({ status: true }).populate({
      path: 'module',
    });
  }

  async findAllDeleted(): Promise<Role[]> {
    return this.roleModel.find({ status: false }).populate({
      path: 'module',
    });
  }

  //Add a single role
  async create(createRole: Role): Promise<Role> {
    const { module, name } = createRole;

    const findName = await this.roleModel.findOne({ name });
    if (findName) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El rol ${name} ya existe.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const getModules = await this.moduleService.findbyNames(module);
    const findModules = getModules.map((mo) => mo._id);

    const modifyData: Role = {
      ...createRole,
      status: true,
      module: findModules,
    };

    const createdRole = new this.roleModel(modifyData);
    return createdRole.save();
  }

  //Delete a single role
  async delete(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.roleModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      //throw new Error(`Error en ProductService.deleteProductById ${e}`);
    }

    return result;
  }

  //Put a single role
  async update(id: string, bodyRole: Role): Promise<Role> {
    const { status, module } = bodyRole;

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

    const getModules = await this.moduleService.findbyNames(module);
    const findModules = getModules.map((mo) => mo._id);

    const modifyData: Role = {
      ...bodyRole,
      module: findModules,
    };

    return await this.roleModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }

  //Restore a single role
  async restore(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.roleModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      //throw new Error(`Error en ProductService.deleteProductById ${e}`);
    }

    return result;
  }

  async findRoleByName(role: string): Promise<RoleDocument> {
    return await this.roleModel.findOne({ name: role }).populate({
      path: 'module',
    });
  }
}
