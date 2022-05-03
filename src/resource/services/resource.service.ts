import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema';
import { Model } from 'mongoose';
import { resourcesByDefault } from 'src/lib/const/consts';

@Injectable()
export class ResourceService implements OnModuleInit {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.resourceModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      //inserta los recursos para los roles
      await this.resourceModel.insertMany(resourcesByDefault);
    } catch (e) {
      throw new Error(`Error en ResourceService.onModuleInit ${e}`);
    }
  }

  // async delete(id: string) {
  //   return await this.resourceModel.findByIdAndDelete(id);
  // }

  async findAll(): Promise<Resource[] | any[]> {
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

    const formatResourcesToFront = order.map((res) => {
      return {
        label: res.name,
        value: res.key,
      };
    });

    return formatResourcesToFront;
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

  //Put a single role
  async update(id: string, bodyRole: Resource): Promise<Resource> {
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
