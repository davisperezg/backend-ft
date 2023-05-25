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
    const resources = await this.resourceModel
      .find({ status: true })
      .populate('group_resource')
      .sort([['name', 'ascending']]);

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

  async findAllToCRUD(): Promise<Resource[] | any[]> {
    const resources = await this.resourceModel
      .find({ status: true })
      .sort([['name', 'ascending']]);

    return resources;
  }

  async findOne(id: string): Promise<Resource | any[]> {
    const resource = await this.resourceModel.findOne({
      _id: id,
      status: true,
    });

    if (!resource) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El permiso no existe o está inactivo.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return resource;
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

    //Solo se permite letras
    const patt = new RegExp(/^[A-Za-z]+$/g);
    if (!patt.test(key)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El key solo permite letras y sin espacios en blanco.`,
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

  //Put a single
  async update(id: string, bodyRole: Resource): Promise<Resource> {
    const { name, key } = bodyRole;

    //buscar el nombre que esta siendo modificado y que no coincida con uno registrado
    const findResource = await this.resourceModel.findById(id);
    const findNameRep = await this.resourceModel.findOne({ name });
    if (findNameRep && findNameRep.name !== findResource.name) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El nombre ya existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //buscar el key que esta siendo modificado y que no coincida con uno registrado
    const findKeyRep = await this.resourceModel.findOne({ key });
    const lowerKey = findKeyRep && findKeyRep.key.toLowerCase().trim();
    if (findKeyRep && lowerKey !== findResource.key.toLowerCase().trim()) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El key ya existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const update = await this.resourceModel.findByIdAndUpdate(id, bodyRole, {
      new: true,
    });
    return update;
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
}
