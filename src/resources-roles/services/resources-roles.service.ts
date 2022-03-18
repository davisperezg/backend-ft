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

@Injectable()
export class ResourcesRolesService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    private readonly roleService: RoleService,
    private readonly resourceService: ResourceService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.rrModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      const allResources = [
        'canCreate_modules',
        'canCreate_roles',
        'canCreate_users',
        'canEdit_modules',
        'canEdit_roles',
        'canEdit_users',
        'canDelete_modules',
        'canDelete_roles',
        'canDelete_users',
        'canPrint_roles',
        'canRead_modules',
        'canRead_roles',
        'canRead_users',
        'canChangePassword_users',
        'canRestore_users',
        'canRestore_modules',
        'canRestore_roles',
        'canRead_Resource',
        'canCreate_Resource',
        'canEdit_Resource',
        'canRead_ResourceR',
        'canCreate_ResourceR',
        'canEdit_ResourceR',
        'canReadRoleX_Resource',
        'canRead_menus',
        'canCreate_menus',
        'canEdit_menus',
        'canDelete_menus',
        'canRestore_menus',
      ];

      const findResources = await this.resourceService.findResourceByKey(
        allResources,
      );

      const getIdsResources = findResources.map((res) => res._id);

      setTimeout(async () => {
        const count = await this.rrModel.estimatedDocumentCount();
        if (count > 0) return;
        const getRole = await this.roleService.findRoleByName(String('OWNER'));

        await this.rrModel.insertMany([
          {
            role: getRole._id,
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
    return await this.rrModel
      .find({ status: true })
      .populate({ path: 'resource' });
  }

  async findOneResourceByRol(idRol: string): Promise<Resource_Role> {
    return await this.rrModel
      .findOne({ status: true, role: idRol as any })
      .populate({ path: 'resource' });
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

    const roleInput = String(role);

    // //busca rol
    const { _id: idRole } = await this.roleService.findRoleByName(roleInput);

    //buscar rol existente en el recurso
    const isExistsRol = await this.rrModel.findOne({ role: idRole });

    if (isExistsRol) {
      const bodyExists = {
        ...createResource,
        role,
        resource,
      };
      this.update(isExistsRol._id, bodyExists);
      return;
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
      role: idRole,
      resource: findResourcesBody,
    };

    const createdResource = new this.rrModel(modifyData);
    return createdResource.save();
  }

  //Put a single role
  async update(id: string, bodyRole: Resource_Role): Promise<Resource_Role> {
    const { status, role, resource } = bodyRole;
    let findRole;
    let findResource;

    // //no se permite el ingreso del estado
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
      const roleInput = String(role).toUpperCase();

      //busca rol
      findRole = await this.roleService.findRoleByName(roleInput); //admin
      let isExistsRoleinRR;

      try {
        //buscar resource existente por rol
        isExistsRoleinRR = await this.rrModel.findOne({ role: findRole._id });
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
    const { role: roleRegistered, resource: resourceRegistered } =
      await this.rrModel.findOne({
        _id: id,
      });

    //si existe recursos en el body, buscar los ids
    if (resource) {
      const resourceInput = Object.keys(resource).map((res) => resource[res]);
      findResource = await this.resourceService.findResourceByKey(
        resourceInput,
      );
    }

    //enviar data
    //si no existe recursos ni rol en el body usar los mismo registrados
    const modifyData: Resource_Role = {
      ...bodyRole,
      role: role ? findRole._id : roleRegistered,
      resource: resource ? findResource : resourceRegistered,
    };

    return await this.rrModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }
}
