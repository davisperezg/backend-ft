import {
  Resource_Role,
  Resource_RoleDocument,
} from './../schemas/resources-role';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import { Model } from 'mongoose';
import {
  Resource_User,
  Resource_UserDocument,
} from 'src/resources-users/schemas/resources-user';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { allResources } from 'src/lib/const/consts';
import {
  CopyResource_User,
  CopyResource_UserDocument,
} from 'src/resources-users/schemas/cp-resource-user';

@Injectable()
export class ResourcesRolesService implements OnApplicationBootstrap {
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

  async onApplicationBootstrap() {
    const count = await this.rrModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      const findResources = await this.resourceService.findResourceByKey(
        allResources,
      );

      const getIdsResources = findResources.map((res) => res._id);

      setTimeout(async () => {
        const count = await this.rrModel.estimatedDocumentCount();
        if (count > 0) return;
        const getRoleOwner = await this.roleService.findRoleByName(
          String('OWNER'),
        );

        const getRoleSA = await this.roleService.findRoleByName(
          String('SUPER ADMINISTRADOR'),
        );

        await this.rrModel.insertMany([
          {
            role: getRoleOwner._id,
            resource: getIdsResources,
            status: true,
          },
          {
            role: getRoleSA._id,
            resource: getIdsResources,
            status: true,
          },
        ]);
      }, 6000);
    } catch (e) {
      throw new Error(`Error en RRService.onModuleInit ${e}`);
    }
  }

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

    const formatToFront = {
      ...resourceOfRol,
      resource: resourceOfRol.resource.map((res: any) => res._doc.key),
    };

    return formatToFront.resource;
  }

  //Add a single role
  async create(
    createResource: Resource_Role,
    user: any,
  ): Promise<Resource_Role> {
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
        isExistsRoleinRR = await this.rrModel.findOne({ role });
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

    //si existe usuarios ejecutar el siguiente codigo
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
    }
    return userRole;
  }
}
