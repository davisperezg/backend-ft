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
  async update(id: string, bodyRole: Role | any, user?: any): Promise<Role> {
    const { status, module, name } = bodyRole;
    const { findUser } = user;

    const findRole = await this.roleModel.findOne({ _id: id });

    //no puedes editar el rol sa o owner
    if (
      (findUser.role.name === 'OWNER' &&
        findRole.name === 'SUPER ADMINISTRADOR' &&
        findRole.name !== name) ||
      (findUser.role.name === 'OWNER' &&
        findRole.name === 'OWNER' &&
        findRole.name !== name) ||
      (findUser.role.name !== 'OWNER' &&
        findRole.name === 'SUPER ADMINISTRADOR' &&
        findRole.name !== name) ||
      (findUser.role.name !== 'OWNER' &&
        findRole.name === 'OWNER' &&
        findRole.name !== name)
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'No puedes modificar este rol.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

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
      throw new Error(`Error en RoleService.restore ${e}`);
    }

    return result;
  }

  async findAll(user: any): Promise<Role[]> {
    const { findUser } = user;
    let listRoles = [];

    const roles = await this.roleModel.find().populate({
      path: 'module',
    });

    const myRol = findUser.role.name; //OWNER

    if (myRol === 'OWNER') {
      listRoles = roles.filter((role) => role.name !== 'OWNER');
    } else {
      const rolPadre = findUser.creator.role.name;
      listRoles = roles.filter(
        (role) =>
          role.name !== 'OWNER' &&
          role.name !== 'SUPER ADMINISTRADOR' &&
          role.name !== myRol &&
          role.name !== rolPadre,
      );
    }

    let findRolesFiltered = [];
    if (findUser.role.name !== 'OWNER') {
      findRolesFiltered = listRoles.map((rol) => {
        return {
          ...rol._doc,
          module: rol._doc.module.filter((mod2) => {
            if (findUser.role.module.some((mod1) => mod1.name === mod2.name)) {
              return {
                ...mod2._doc,
                name: mod2.name,
              };
            }
          }),
        };
      });

      findRolesFiltered.map((flts) => {
        const data = {
          module: flts.module.map((mod) => mod.name),
        };
        this.update(flts._id, data);
      });
    }

    return findUser.role.name === 'OWNER' ? listRoles : findRolesFiltered;
  }

  async findRoleById(role: string, user: any): Promise<RoleDocument | any> {
    const rol: any = await this.roleModel
      .findOne({ _id: role })
      .populate('module');
    const modules = rol.module;
    const { findUser } = user;

    //console.log(findUser); //super
    //console.log(findUser.role.module);//super tiene solo sistema
    //console.log(modules); // el rol buscad otiene almacen - compro- sistema

    const validaModules = [];
    if (
      findUser.role.name !== 'OWNER' ||
      findUser.role.name !== 'SUPER ADMINISTRADOR'
    ) {
      findUser.role.module.filter((mod) => {
        modules.filter((mods) => {
          if (mod.name === mods.name) {
            validaModules.push(mod);
          }
        });
      });
    }

    const dataRol = {
      ...rol._doc,
      module: validaModules,
    };

    return findUser.role.name === 'OWNER' ? rol : dataRol;
  }

  async findRoleByName(role: string): Promise<RoleDocument> {
    const rol = await this.roleModel.findOne({ name: role, status: true });

    if (!rol) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El rol está inactivo.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return rol;
  }

  async findRoleByNames(name: string[]): Promise<RoleDocument[]> {
    return await this.roleModel.find({ name: { $in: name }, status: true });
  }
}
