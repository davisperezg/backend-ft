import { MOD_PRINCIPAL, ROL_PRINCIPAL } from 'src/lib/const/consts';
import { CopyServicesDocument } from './../../services-users/schemas/cp-services-user';
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
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
import { ModuleService } from 'src/module/services/module.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CreateRolDTO } from '../dto/create-rol.dto';
import { UpdateModuleDTO } from '../dto/update-rol.dto';

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
    @Inject(forwardRef(() => ModuleService))
    private readonly moduleService: ModuleService,
  ) {}

  async findAllDeleted(): Promise<Role[]> {
    return this.roleModel.find({ status: false }).populate({
      path: 'module',
    });
  }

  //Add a single role
  async create(createRole: CreateRolDTO, userToken: QueryToken): Promise<Role> {
    const { module, name } = createRole;
    const { tokenEntityFull } = userToken;

    //No pueden crear el rol principal
    if (name.toLowerCase() === ROL_PRINCIPAL.toLowerCase())
      throw new HttpException('Permiso denegado', HttpStatus.CONFLICT);

    //Validamos si los modulos entrantes existen o estan inactivos y que no puedan crear el modulo principal
    const findModules = await this.moduleService.findModulesIds(module);
    const isExisteModuleASP = findModules.some((a) => a.name === MOD_PRINCIPAL);
    if (isExisteModuleASP)
      throw new HttpException('Permiso denegado', HttpStatus.CONFLICT);

    //Si encuentra el rol creado por el mismo usuario se valida y muestra mensaje
    const findRoles = await this.roleModel.find({
      name,
      creator: [null, tokenEntityFull._id],
    });
    const getRolByCreator = findRoles.find(
      (role) => role.name.toLowerCase() === name.toLowerCase(),
    );

    if (getRolByCreator)
      throw new HttpException('El rol ya existe', HttpStatus.BAD_REQUEST);

    //preparamos objeto para enviar data
    const modifyData = {
      ...createRole,
      status: true,
      module,
      creator: tokenEntityFull._id,
    };
    const createdRole = new this.roleModel(modifyData);

    //cualquier rol que es creado obtendra los permisos del usuario padre o de lo contrario todos los permisos
    const findRU = await this.ruModel.findOne({ user: tokenEntityFull._id });

    try {
      await new this.rrModel({
        role: createdRole._id,
        status: true,
        resource: findRU.resource,
      }).save();
    } catch (e) {
      throw new HttpException(
        'No se pueden obtener los permisos del usuario creador',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return createdRole.save();
    } catch (e) {
      throw new HttpException(
        'Error al intentar crear rol',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Delete a single role
  async delete(id: string): Promise<boolean> {
    let result = false;

    const findRoleForbidden = await this.roleModel.findById(id);

    if (findRoleForbidden.status === false)
      throw new HttpException(
        'El rol ya ha sido desactivado',
        HttpStatus.BAD_REQUEST,
      );

    if (findRoleForbidden.name === ROL_PRINCIPAL)
      throw new HttpException('Permiso denegado', HttpStatus.CONFLICT);

    try {
      await this.roleModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      throw new HttpException(
        'Error al desactivar rol',
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  //Put a single role
  async update(id: string, bodyRole: UpdateModuleDTO, user: QueryToken) {
    const { module, name } = bodyRole;
    const { tokenEntityFull } = user;

    const findRole = await this.roleModel.findById(id);
    const findModulesByIds = await this.moduleService.findModulesIds(module);
    const isExisteModuleASP = findModulesByIds.some(
      (a) => a.name === MOD_PRINCIPAL,
    );

    //Ningun rol puede modificar el rol OWNER ni ninguno puede poner el nombre OWNER
    if (
      (findRole.name === ROL_PRINCIPAL &&
        String(name).toLowerCase().trim() !== ROL_PRINCIPAL.toLowerCase()) ||
      (findRole.name !== ROL_PRINCIPAL &&
        String(name).toLowerCase().trim() === ROL_PRINCIPAL.toLowerCase()) ||
      (findRole.name === ROL_PRINCIPAL && !isExisteModuleASP) ||
      (findRole.name !== ROL_PRINCIPAL && isExisteModuleASP)
    )
      throw new HttpException('Permiso denegado', HttpStatus.CONFLICT);

    //Si actualizan el nombre primero buscamos si el rol actualizando ya existe.
    const findRolesRep = await this.roleModel.find({
      name,
      creator: [null, tokenEntityFull._id],
    });

    const existRoleRegistered = findRolesRep.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );

    //Muestra que el rol ya exsite siempre y cuando el usuario no sea owner
    if (
      existRoleRegistered &&
      tokenEntityFull.role.name.toLowerCase() !== ROL_PRINCIPAL.toLowerCase()
    )
      throw new HttpException('El rol ya existe', HttpStatus.BAD_REQUEST);

    //Validamos si los modulos entrantes existen o estan inactivos
    const arrayToString: string[] = Object.keys(module).map(
      (mod) => module[mod],
    );
    await this.moduleService.findModulesIds(arrayToString);

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
        ) as any[];

        console.log(
          module.filter(
            (res: any) => !ru.module.map((a) => String(a)).includes(res),
          ),
        );
        console.log('--------------------');
        console.log(buscarModificadosARU);

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

    const findRol = await this.roleModel.findById(id);
    if (findRol.status === true)
      throw new HttpException('El rol ya está activo', HttpStatus.BAD_REQUEST);

    if (findRol.name === ROL_PRINCIPAL)
      throw new HttpException('Permiso denegado', HttpStatus.CONFLICT);

    try {
      await this.roleModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      throw new HttpException('Error al restaurar rol', HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  //Lista los roles para el crud roles
  async findAll(user: QueryToken): Promise<RoleDocument[] | any[]> {
    const { tokenEntityFull } = user;
    let listRoles = [];

    //Solo el owner puede ver todos lo roles
    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      const rolesFindDb = await this.roleModel
        .find({
          $or: [{ creator: null }, { creator: tokenEntityFull._id }],
        })
        .populate([
          {
            path: 'module',
          },
          {
            path: 'creator',
          },
        ]);
      listRoles = rolesFindDb;
    } else {
      //Cualquier otro usuario puede ver sus roles creados por el mismo
      const rolesFindDb = await this.roleModel
        .find({ creator: tokenEntityFull._id })
        .populate([
          {
            path: 'module',
          },
          {
            path: 'creator',
          },
        ]);
      listRoles = rolesFindDb.filter((role) => role.name !== ROL_PRINCIPAL);
    }

    //console.log(listRoles);
    const sentToFront = listRoles.map((rol) => {
      return {
        _id: rol._id,
        name: rol.name,
        status: rol.status,
        description: rol.description,
        creator: rol.creator
          ? rol.creator.name + ' ' + rol.creator.lastname
          : 'NINGUNO',
        module: rol.module,
      };
    });

    return sentToFront;
  }

  //Lista los roles disponibles para asignar usuario
  async listRolesUsers(user: QueryToken) {
    const { tokenEntityFull } = user;
    try {
      const roles = await this.roleModel.find({
        creator: tokenEntityFull._id,
      });
      return roles.map((a) => ({ name: a.name, _id: a._id }));
    } catch (e) {
      throw new HttpException(
        'Error al obtener la lista de roles disponibles.',
        HttpStatus.CONFLICT,
      );
    }
  }

  async findOneCreator(role: string) {
    return await this.roleModel.findById(role).populate('creator');
  }

  async findRoleById(role: string) {
    let rol;

    try {
      rol = await this.roleModel
        .findOne({ _id: role, status: true })
        .populate({ path: 'module' });
    } catch (e) {
      throw new HttpException(
        'Error al obtener el rol.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //si no encuentra un rol de estado true, se valida y muestra mensaje
    if (!rol) {
      throw new HttpException(
        'El rol no existe o está inactivo.',
        HttpStatus.CONFLICT,
      );
    }

    //formatear modulos
    const toListData = {
      ...rol._doc,
      module: rol.module.map((format: any) => format._id),
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

  async findRolesWithManyCreators_Local(idCreator: string[]): Promise<any[]> {
    const roles = await this.roleModel.find({
      creator: { $in: idCreator as any },
    });
    return roles;
  }
}
