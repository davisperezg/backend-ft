import { Role, RoleDocument } from './../../role/schemas/role.schema';
import {
  Resource_Role,
  Resource_RoleDocument,
} from './../../resources-roles/schemas/resources-role';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema';
import { Model } from 'mongoose';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CreateResourceDTO } from '../dto/create-resource';
import { UpdateResourceDTO } from '../dto/update-resource';

@Injectable()
export class ResourceService {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // async delete(id: string) {
  //   return await this.resourceModel.findByIdAndDelete(id);
  // }

  async findAll(user: QueryToken): Promise<Resource[] | any[]> {
    const { tokenEntityFull } = user;
    let resources = [];

    try {
      resources = await this.resourceModel
        .find({ status: true })
        .populate('group_resource')
        .sort([['name', 'ascending']]);
    } catch (e) {
      throw new HttpException(
        'Error al listar los recursos disponibles.',
        HttpStatus.CONFLICT,
      );
    }

    const resourcesAlloweds = await this.rrModel.findOne({
      role: tokenEntityFull.role._id,
    });

    const resourcesToUser = await this.resourceModel
      .find({
        _id: { $in: resourcesAlloweds.resource },
        status: true,
      })
      .populate('group_resource')
      .sort([['name', 'ascending']]);

    let formatResourcesToFront = [];
    if (tokenEntityFull.role.name !== ROL_PRINCIPAL) {
      formatResourcesToFront = resourcesToUser.map((res) => {
        return {
          label: res.name,
          value: res.key,
          category: res.group_resource.name,
        };
      });
    } else {
      formatResourcesToFront = resources.map((res) => {
        return {
          label: res.name,
          value: res.key,
          category: res.group_resource.name,
        };
      });
    }

    const resourcesByCategory = formatResourcesToFront.reduce(
      (acumulador, item) => {
        /**
         * Buscar la misma categoria en el array acumulador.
         * El acumulador inicia vacio([]) por lo que index inicia con -1
         */
        const index = acumulador.findIndex(
          (elemento) => elemento.category === item.category,
        );

        /**
         * Si no se encuentra la categoria o el acumulador esta vacio([])
         * se agrega al acumulador
         */
        if (index === -1) {
          acumulador = [
            ...acumulador,
            {
              category: item.category,
              resources: [{ label: item.label, value: item.value }],
            },
          ];
        } else {
          /**
           * Si se encuentra la misma categoria en el array, entramos
           * a su objeto ENCONTRADO y solo agregamos el recurso del objeto actual
           */
          acumulador[index].resources = [
            ...acumulador[index].resources,
            { label: item.label, value: item.value },
          ];
        }

        return acumulador;
      },
      [],
    );

    return resourcesByCategory;
  }

  async findAllToCRUD(): Promise<Resource[]> {
    return await this.resourceModel.find().populate({ path: 'group_resource' });
  }

  async findActiveResourceById(id: string): Promise<Resource> {
    const resource = await this.resourceModel.findOne({
      _id: id,
      status: true,
    });

    if (!resource) {
      throw new HttpException(
        'El permiso no existe o está inactivo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return resource;
  }

  //Add a single role
  async create(createResource: CreateResourceDTO): Promise<Resource> {
    const { name, key } = createResource;

    const findExistsXName = await this.resourceModel.findOne({ name });
    const findExistsXKey = await this.resourceModel.findOne({ key });

    if (findExistsXName || findExistsXKey) {
      throw new HttpException(
        'El nombre o el key ya existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const modifyData = {
      ...createResource,
      status: true,
    };

    const createdResource = new this.resourceModel(modifyData);
    return createdResource.save();
  }

  //Put a single
  async update(id: string, bodyRole: UpdateResourceDTO): Promise<Resource> {
    const { name, key } = bodyRole;

    //buscar el nombre que esta siendo modificado y que no coincida con uno registrado
    const resource = await this.findActiveResourceById(id);
    const resourceByName = await this.resourceModel.findOne({ name });
    if (resourceByName && resourceByName.name !== resource.name) {
      throw new HttpException('El nombre ya existe.', HttpStatus.BAD_REQUEST);
    }

    //buscar el key que esta siendo modificado y que no coincida con uno registrado
    const resourceByKey = await this.resourceModel.findOne({ key });
    const lowerKey = resourceByKey && resourceByKey.key.toLowerCase().trim();
    if (resourceByKey && lowerKey !== resource.key.toLowerCase().trim()) {
      throw new HttpException('El key ya existe.', HttpStatus.BAD_REQUEST);
    }

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

  async findResourcesById(id: string[]): Promise<ResourceDocument[]> {
    return await this.resourceModel.find({
      _id: { $in: id },
      status: true,
    });
  }

  async delete(id: string) {
    let result = false;

    const resource = await this.resourceModel.findById(id);

    if (!resource.status)
      throw new HttpException(
        'El permiso ya ha sido desactivado.',
        HttpStatus.BAD_REQUEST,
      );

    try {
      await this.resourceModel.findByIdAndUpdate(
        id,
        {
          status: false,
        },
        { new: true },
      );

      result = true;
    } catch (e) {
      throw new HttpException(
        `Error al intentar actualizar recurso.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  async restore(id: string) {
    let result = false;

    const resource = await this.resourceModel.findById(id);

    if (resource.status)
      throw new HttpException(
        'El permiso ya está activo.',
        HttpStatus.BAD_REQUEST,
      );

    try {
      await this.resourceModel.findByIdAndUpdate(
        id,
        {
          status: true,
        },
        { new: true },
      );

      result = true;
    } catch (e) {
      throw new HttpException(
        `Error al intentar actualizar recurso.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }
}
