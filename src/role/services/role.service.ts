import { CopyServicesDocument } from './../../services-users/schemas/cp-services-user';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';
import {
  Resource_User,
  Resource_UserDocument,
} from 'src/resources-users/schemas/resources-user';
import {
  Resource_Role,
  Resource_RoleDocument,
} from 'src/resources-roles/schemas/resources-role';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import {
  Services_User,
  Services_UserDocument,
} from 'src/services-users/schemas/services-user';
import { CopyServices_User } from 'src/services-users/schemas/cp-services-user';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    @InjectModel(CopyServices_User.name)
    private copySUModel: Model<CopyServicesDocument>,
  ) {}

  async findAllDeleted(): Promise<Role[]> {
    return this.roleModel.find({ status: false }).populate({
      path: 'module',
    });
  }

  //Add a single role
  async create(createRole: Role, userToken: any): Promise<Role> {
    const { module, name } = createRole;
    const { findUser } = userToken;
    //console.log(creator);
    //Si el campo nombre no existe
    if (!name) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo nombre.',
        },
        HttpStatus.CONFLICT,
      );
    }

    //Si no hay modulos ingresados
    if (!module || module.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El rol debe tener al menos un modulo.',
        },
        HttpStatus.CONFLICT,
      );
    }

    const findRoles = await this.roleModel.find({ name });
    const getRolByCreator = findRoles.find(
      (role) => String(role.creator) === String(findUser._id),
    );
    //Si encuentra el rol y es el mismo rol que ha creado el creador se valida y muestra mensaje
    if (getRolByCreator) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El rol ${name} ya existe.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //const getModules = await this.moduleService.findbyNames(module);
    //const findModules = getModules.map((mo) => mo._id);

    const modifyData: Role = {
      ...createRole,
      status: true,
      module,
      creator: findUser._id,
    };

    const createdRole = new this.roleModel(modifyData);

    //cualquier rol que es creado obtendra los permisos del usuario padre o de lo contrario todos los permisos
    const findRU = await this.ruModel.findOne({ user: findUser._id });
    await new this.rrModel({
      role: createdRole._id,
      status: true,
      resource: findRU.resource,
    }).save();

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
    if (user) {
      const { findUser } = user;
      const findRole = await this.roleModel.findOne({ _id: id });

      //no puedes editar el rol sa o owner
      if (
        (findUser.role === 'OWNER' &&
          findRole.name === 'SUPER ADMINISTRADOR' &&
          findRole.name !== name) ||
        (findUser.role === 'OWNER' &&
          findRole.name === 'OWNER' &&
          findRole.name !== name) ||
        (findUser.role !== 'OWNER' &&
          findRole.name === 'SUPER ADMINISTRADOR' &&
          findRole.name !== name) ||
        (findUser.role !== 'OWNER' &&
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

    // const getModules = await this.moduleService.findbyNames(module);
    // const findModules = getModules.map((mo) => mo._id);

    // const modifyData: Role = {
    //   ...bodyRole,
    //   module: findModules,
    // };

    const users = await this.findUsersWithOneRole_Local(id);

    if (users.length > 0) {
      const arrayOfStringIds = users.map((format) => format._id);
      const findCopysSU = await this.copySUModel.find({ status: true });

      const modificados = [];
      users.filter((a) => {
        findCopysSU.filter((x) => {
          if (String(x.user) === String(a._id)) {
            modificados.push(a);
          }
        });
      });

      const noModificados = users.filter((fil) => !modificados.includes(fil));

      noModificados.map(async (noMod) => {
        //actualiza los mismo recursos enviados al rol hacia los usuarios que contienen el rol
        await this.suModel.findOneAndUpdate(
          {
            user: noMod._id,
            //resources: { $elemMatch: { userUpdated: false } },
          },
          { $set: { module: module } },
          { new: true },
        );
      });

      const findRUModifieds = await this.copySUModel.find({
        user: { $in: arrayOfStringIds },
      });

      const dataSUMofied = findRUModifieds.map(async (ru) => {
        const enru = await this.suModel.findOne({
          user: ru.user,
          status: true,
        });

        const buscarModificadosARU = enru.module.filter((t) =>
          ru.module.includes(t),
        );

        return {
          module: module
            .filter(
              (res: any) => !ru.module.map((a) => String(a)).includes(res),
            )
            .concat(buscarModificadosARU),
          user: ru.user,
        };
      });

      dataSUMofied.map(async (data) => {
        await this.suModel.findOneAndUpdate(
          { user: (await data).user },
          {
            module: (await data).module,
          },
          { new: true },
        );
      });
    }

    return await this.roleModel.findByIdAndUpdate(id, bodyRole, {
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
    let rolesFindDb = [];

    //Solo el owner puede ver todos lo roles
    if (findUser.role === 'OWNER') {
      rolesFindDb = await this.roleModel.find().populate([
        {
          path: 'module',
        },
        {
          path: 'creator',
        },
      ]);
    } else {
      //Cualquier otro usuario puede ver sus roles creados por el mismo
      rolesFindDb = await this.roleModel
        .find({ creator: findUser._id })
        .populate([
          {
            path: 'module',
          },
          {
            path: 'creator',
          },
        ]);
    }

    const myRol = findUser.role; //OWNER

    if (myRol === 'OWNER') {
      listRoles = rolesFindDb.filter((role) => role.name !== 'OWNER');
    } else {
      const rolPadre = await this.findOneCreator(findUser._id);
      //findUser.creator.role?.name
      listRoles = rolesFindDb.filter(
        (role) =>
          role.name !== 'OWNER' &&
          role.name !== 'SUPER ADMINISTRADOR' &&
          role.name !== myRol &&
          role.name !== rolPadre,
      );
    }

    let findRolesFiltered = [];
    if (findUser.role !== 'OWNER') {
      findRolesFiltered = listRoles.map((rol) => {
        return {
          ...rol._doc,
          module: rol._doc.module.filter((mod2) => {
            if (findUser.role.modules.some((mod1) => mod1.name === mod2.name)) {
              return {
                ...mod2._doc,
                name: mod2.name,
              };
            }
          }),
        };
      });

      const promiseArray = findRolesFiltered.map(async (flts) => {
        const data = {
          module: flts.module.map((mod) => mod.name),
        };
        await this.update(flts._id, data);
      });
      await Promise.all(promiseArray);
    }

    //formatear modulos
    const toListRoles = listRoles.map((format) => {
      return {
        ...format._doc,
        module: format.module.map((format) => format.name),
        creator: format.creator
          ? format.creator.name + ' ' + format.creator.lastname
          : 'NINGUNO',
      };
    });
    //formatear modulos
    const toListFiltered =
      findRolesFiltered?.map((format) => {
        return {
          ...format,
          module: format.module.map((format) => format.name),
          creator: format.creator.name + ' ' + format.creator.lastname,
        };
      }) || [];

    return findUser.role === 'OWNER' ? toListRoles : toListFiltered;
  }

  async findOneCreator(role: string) {
    return await this.roleModel.findById(role).populate('creator');
  }

  async findRoleById(role: string, user?: any): Promise<RoleDocument | any> {
    const rol: any = await this.roleModel
      .findOne({ _id: role, status: true })
      .populate({ path: 'module' });

    //si no encuentra un rol de estado true, se valida y muestra mensaje
    if (!rol) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El rol no existe o está inactivo.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // const modules = rol.module;
    // const validaModules = [];

    // if (user) {
    //   const { findUser } = user;

    //   if (
    //     findUser.role !== 'OWNER' ||
    //     findUser.role !== 'SUPER ADMINISTRADOR'
    //   ) {
    //     findUser.role.modules.filter((mod) => {
    //       modules.filter((mods) => {
    //         if (mod.name === mods.name) {
    //           validaModules.push(mod);
    //         }
    //       });
    //     });
    //   }
    // }

    // const dataRol = {
    //   ...rol._doc,
    //   module: validaModules,
    // };

    // //formatear modulos
    // const toListRol = {
    //   ...rol._doc,
    //   module: rol._doc.module.map((format) => format._id),
    // };

    // //formatear modulos
    const toListData = {
      ...rol._doc,
      module: rol._doc.module.map((format) => format._id),
    };

    return toListData;
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

  async findModulesByOneRol(idRol: string): Promise<RoleDocument> {
    return await this.roleModel.findById(idRol);
  }

  async findUsersWithOneRole_Local(idRol: string): Promise<any> {
    const users = await this.userModel.find({ role: idRol as any });
    return users;
  }

  async findOneRolAndUpdateUsersModules_Local(
    isUsers: string[],
  ): Promise<Services_UserDocument[]> {
    const users = await this.suModel.find({ user: { $in: isUsers as any } });
    return users;
  }
}
