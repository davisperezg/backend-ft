import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema';
import { Model } from 'mongoose';

@Injectable()
export class ResourceService implements OnModuleInit {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.resourceModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      await this.resourceModel.insertMany([
        {
          name: 'Leer Modulos', //add
          key: 'canRead_modules',
          status: true,
        },
        {
          name: 'Crear Modulos', //add
          key: 'canCreate_modules',
          status: true,
        },
        {
          name: 'Editar Modulos', //add
          key: 'canEdit_modules',
          status: true,
        },
        {
          name: 'Eliminar Modulos', //add
          key: 'canDelete_modules',
          status: true,
        },
        {
          name: 'Leer Roles', //add
          key: 'canRead_roles',
          status: true,
        },
        {
          name: 'Crear Roles', //add
          key: 'canCreate_roles',
          status: true,
        },
        {
          name: 'Editar Roles', //add
          key: 'canEdit_roles',
          status: true,
        },
        {
          name: 'Eliminar Roles', //add
          key: 'canDelete_roles',
          status: true,
        },
        {
          name: 'Imprimir Roles', //add
          key: 'canPrint_roles',
          status: true,
        },
        {
          name: 'Leer Usuarios', //add
          key: 'canRead_users',
          status: true,
        },
        {
          name: 'Crear Usuarios', //add
          key: 'canCreate_users',
          status: true,
        },
        {
          name: 'Editar Usuarios', //add
          key: 'canEdit_users',
          status: true,
        },
        {
          name: 'Eliminar Usuarios', //add
          key: 'canDelete_users',
          status: true,
        },
        {
          name: 'Cambiar contraseña de usuarios', //add
          key: 'canChangePassword_users',
          status: true,
        },
        {
          name: 'Restaurar Usuarios', //add
          key: 'canRestore_users',
          status: true,
        },
        {
          name: 'Restaurar Modulos', //add
          key: 'canRestore_modules',
          status: true,
        },
        {
          name: 'Restaurar Roles', //add
          key: 'canRestore_roles',
          status: true,
        },
        {
          name: 'Crear solo recursos', //add
          key: 'canCreate_Resource',
          status: true,
        },
        {
          name: 'Leer solo recursos', //add
          key: 'canRead_Resource',
          status: true,
        },
        {
          name: 'Editar solo recursos', //add
          key: 'canEdit_Resource',
          status: true,
        },
        {
          name: 'Ver todos los recursos con roles', //add
          key: 'canRead_ResourceR',
          status: true,
        },
        {
          name: 'Activar sus recursos', //add
          key: 'canReadRoleX_Resource',
          status: true,
        },
        {
          name: 'Editar los recursos por roles', //add
          key: 'canEdit_ResourceR',
          status: true,
        },
        {
          name: 'Crear recursos por roles', //add
          key: 'canCreate_ResourceR',
          status: true,
        },

        {
          name: 'Ver Menus', //add
          key: 'canRead_menus',
          status: true,
        },
        {
          name: 'Crear Menu', //add
          key: 'canCreate_menus',
          status: true,
        },
        {
          name: 'Editar Menu', //add
          key: 'canEdit_menus',
          status: true,
        },
        {
          name: 'Eliminar Menu', //add
          key: 'canDelete_menus',
          status: true,
        },
        {
          name: 'Restaurar Menu', //add
          key: 'canRestore_menus',
          status: true,
        },
      ]);
    } catch (e) {
      throw new Error(`Error en ResourceService.onModuleInit ${e}`);
    }
  }

  // async delete(id: string) {
  //   return await this.resourceModel.findByIdAndDelete(id);
  // }

  async findAll(): Promise<Resource[]> {
    const resources = await this.resourceModel.find({ status: true });
    const order = resources.sort((a, b) => {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      // a must be equal to b
      return 0;
    });

    return order;
  }

  //Add a single role
  async create(createResource: Resource): Promise<Resource> {
    const { name, key } = createResource;

    if (!name || !key) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `Los campos nombre y key son requeridos.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const findExistsXName = await this.resourceModel.findOne({ name });
    const findExistsXKey = await this.resourceModel.findOne({ key });

    if (findExistsXName || findExistsXKey) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El nombre o el key ya existe.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const modifyData: Resource = {
      ...createResource,
      status: true,
    };

    const createdResource = new this.resourceModel(modifyData);
    return createdResource.save();
  }

  //Put a single role
  async update(id: string, bodyRole: Resource): Promise<Resource> {
    return await this.resourceModel.findByIdAndUpdate(id, bodyRole, {
      new: true,
    });
  }

  async findResourceByKey(key: string[]): Promise<ResourceDocument[]> {
    return await this.resourceModel.find({
      key: { $in: key },
      status: true,
    });
  }
}
