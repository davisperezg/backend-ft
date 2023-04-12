import {
  Resource_Role,
  Resource_RoleDocument,
} from './../schemas/resources-role';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import { Model } from 'mongoose';
import {
  Resource_User,
  Resource_UserDocument,
} from 'src/resources-users/schemas/resources-user';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { RECURSOS_DEFECTOS, ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  CopyResource_User,
  CopyResource_UserDocument,
} from 'src/resources-users/schemas/cp-resource-user';

@Injectable()
export class ResourcesRolesService {
  constructor(
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    private readonly roleService: RoleService,
    private readonly resourceService: ResourceService,
    @InjectModel(Resource_User.name)
    private userResourceModel: Model<Resource_UserDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(CopyResource_User.name)
    private copyRuModel: Model<CopyResource_UserDocument>,
  ) {}

  async findAll(): Promise<Resource_Role[]> {
    const resources = await this.rrModel
      .find({ status: true })
      .populate([{ path: 'resource' }, { path: 'role' }]);

    return resources;
  }

  async findOneResourceByRol(idRol: string): Promise<Resource_RoleDocument[]> {
    const resourceOfRol = await this.rrModel
      .findOne({ status: true, role: idRol as any })
      .populate({ path: 'resource' });

    const formatToFront =
      resourceOfRol?.resource.map((res: any) => res._doc.key) || [];

    return formatToFront;
  }

  //Add a single role
  async create(createResource: Resource_Role): Promise<Resource_Role> {
    const { role, resource } = createResource;

    if (!role || !resource) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `Los campos rol y recurso son requeridos.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const findIfExisteRole = await this.roleService.findRoleById(String(role));
    if (!findIfExisteRole) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El rol no existe.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //buscar rol existente en el recurso
    const isExistsResource = await this.rrModel.findOne({ role: role });
    if (isExistsResource) {
      const bodyExists = {
        ...createResource,
        role,
        resource,
      };
      return await this.update(isExistsResource._id, bodyExists);
    }

    const resourceInput: string[] = Object.keys(resource).map(
      (res) => resource[res],
    );

    //busca recurso
    const findResourcesBody = await this.resourceService.findResourceByKey(
      resourceInput,
    );

    const modifyData: Resource_Role = {
      ...createResource,
      status: true,
      role: role,
      resource: findResourcesBody,
    };

    const createdResource = new this.rrModel(modifyData);

    return createdResource.save();
  }

  //Put a single role
  async update(
    id: string,
    bodyRole: Resource_Role,
  ): Promise<Resource_Role | any> {
    const { status, role, resource } = bodyRole;
    let findResource;

    //no se permite el ingreso del estado
    if (status === true || status === false) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // //validamos si el recurso no existe o esta inactivo
    const findRR = await this.rrModel.findById(id);
    if (!findRR) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El recurso no existe o esta inactivo.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //ejecutar codigo si existe rol en el body
    if (role) {
      //busca rol
      let isExistsRoleinRR;

      try {
        //buscar resource existente por rol
        isExistsRoleinRR = await this.rrModel.findOne({ role }).populate([
          {
            path: 'role',
          },
          {
            path: 'resource',
          },
        ]);
      } catch (e) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            type: 'BAD_REQUEST',
            message: `No hay un recurso registrado con ese rol.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      //console.log(isExistsRoleinRR);

      if (isExistsRoleinRR.role.name === ROL_PRINCIPAL) {
        const resFormateds = Object.keys(resource).map((a) =>
          resource[a].toLowerCase(),
        );
        const resDefaults = RECURSOS_DEFECTOS.map((b) => b.key.toLowerCase());
        const isEqualsResWithResDefault = resDefaults.every((a) =>
          resFormateds.includes(a),
        );

        if (!isEqualsResWithResDefault) {
          throw new HttpException(
            {
              status: HttpStatus.UNAUTHORIZED,
              type: 'UNAUTHORIZED',
              message: `Unauthorized Exception`,
            },
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      //si existe en la bd pero no coincide con el param id
      if (String(id) !== String(isExistsRoleinRR._id)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            type: 'BAD_REQUEST',
            message: `El id no coincide con el rol ingresado.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    //si no existe buscar su mismo rol registrado
    const { role: roleRegistered, resource: resourceRegistered } = findRR;

    //si existe recursos en el body, buscar los ids
    if (resource) {
      const resourceInput: string[] = Object.keys(resource).map(
        (res) => resource[res],
      );

      findResource = await this.resourceService.findResourceByKey(
        resourceInput,
      );
    }

    //enviar data
    //si no existe recursos ni rol en el body usar los mismo registrados
    const sendData: Resource_Role = {
      ...bodyRole,
      role: role ? role : roleRegistered,
      resource: resource ? findResource : resourceRegistered,
    };

    //se actualiza los recursos del rol
    const userRole = await this.rrModel.findByIdAndUpdate(id, sendData, {
      new: true,
    });

    //segun el rol actualizado busco a los usuarios quien tiene el rol
    const findUsersByRol = await this.userModel.find({
      role: userRole.role,
    });

    //si existe usuarios con el mismo rol que esta siendo actualziado ejecutar el siguiente codigo
    if (findUsersByRol.length > 0) {
      const arrayOfStringIds = findUsersByRol.map((format) => format._id);

      const findCopysRu = await this.copyRuModel.find({ status: true });

      const modificados = [];
      findUsersByRol.filter((a) => {
        findCopysRu.filter((x) => {
          if (String(x.user) === String(a._id)) {
            modificados.push(a);
          }
        });
      });

      const noModificados = findUsersByRol.filter(
        (fil) => !modificados.includes(fil),
      );

      noModificados.map(async (noMod) => {
        //actualiza los mismo recursos enviados al rol hacia los usuarios que contienen el rol
        await this.userResourceModel.findOneAndUpdate(
          {
            user: noMod._id,
            //resources: { $elemMatch: { userUpdated: false } },
          },
          { $set: { resource: sendData.resource } },
          { new: true },
        );
      });

      /**parte en la que validamos que solo afectara los cambios a los que no fueron modificados desde el usuario**/

      //buscamos si en el esquema copyresoureces_users existe recursos modificados por el mismo usuario
      const findRUModifieds = await this.copyRuModel.find({
        user: { $in: arrayOfStringIds },
      });

      //preparamos la logica del ejemplo anterior
      const dataRUMofied = findRUModifieds.map(async (ru) => {
        const enru = await this.userResourceModel.findOne({
          user: ru.user,
          status: true,
        });

        const buscarModificadosARU = enru.resource.filter((t) =>
          ru.resource.includes(t),
        );

        return {
          resource: sendData.resource
            .filter((res: any) => !ru.resource.includes(res._id))
            .concat(buscarModificadosARU),
          user: ru.user,
        };
      });

      //recorremos los usuarios modificados y enviaremos los recursos. Ejmplo: UsuarioA se actulizará 11 recursos si seguimos el mismo ejemplo del usuarioB seria 5 recursos a enviar.
      dataRUMofied.map(async (data) => {
        await this.userResourceModel.findOneAndUpdate(
          { user: (await data).user },
          {
            resource: (await data).resource,
          },
          { new: true },
        );
      });

      //Este es el proceso de, buscar los roles creados por los usuarios que contienen el rol que esta siendo actualizado.
      const findRolesWithCreators =
        await this.roleService.findRolesWithManyCreators_Local(
          arrayOfStringIds,
        );

      //Actualiza los recursos a todos los roles RR
      findRolesWithCreators.map(async (res) => {
        await this.rrModel.findOneAndUpdate(
          {
            role: res,
          },
          {
            $set: { resource: sendData.resource },
          },
          {
            new: true,
          },
        );
      });

      /**
       * Inicia el proceso de actualizar los recursos "no modificados" pero de a todos los usuarios RU => porque el que usa los recursos el RU y no RR
       */
      const findUsersByRoles = await this.userModel.find({
        role: { $in: findRolesWithCreators.map((res) => res._id) },
      });

      const modifys2 = [];
      findUsersByRoles.filter((a) => {
        findCopysRu.filter((x) => {
          if (String(x.user) === String(a._id)) {
            modifys2.push(a);
          }
        });
      });

      const noModifys2 = findUsersByRoles.filter(
        (fil) => !modifys2.includes(fil),
      );

      noModifys2.map(async (noMod) => {
        await this.userResourceModel.findOneAndUpdate(
          {
            user: noMod._id,
          },
          { $set: { resource: sendData.resource } },
          { new: true },
        );
      });
      /**
       *  Fin de proceso de actualizar RU
       */

      /**
       * Inicia proceso de actualizar los recursos de los usuario RU pero envitando a los que estan en Copy que vienen hacer los modificados por el usuario
       */
      const arrayOfStringIds2 = findUsersByRoles.map((format) => format._id);

      const findRUModifieds2 = await this.copyRuModel.find({
        user: { $in: arrayOfStringIds2 },
      });

      const dataRUMofied2 = findRUModifieds2.map(async (ru) => {
        const enru = await this.userResourceModel.findOne({
          user: ru.user,
          status: true,
        });

        const findModifyedsRU = enru.resource.filter((t) =>
          ru.resource.includes(t),
        );

        return {
          resource: sendData.resource
            .filter((res: any) => !ru.resource.includes(res._id))
            .concat(findModifyedsRU),
          user: ru.user,
        };
      });

      dataRUMofied2.map(async (data) => {
        await this.userResourceModel.findOneAndUpdate(
          { user: (await data).user },
          {
            resource: (await data).resource,
          },
          { new: true },
        );
      });
      /**
       * Fin de proceso
       */
    }
    return userRole;
  }
}
