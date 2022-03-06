import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema';
import { Model } from 'mongoose';

@Injectable()
export class ResourceService {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
  ) {}

  async delete(id: string) {
    return await this.resourceModel.findByIdAndDelete(id);
  }

  async findAll(): Promise<Resource[]> {
    return await this.resourceModel.find({ status: true });
  }

  //Add a single role
  async create(createResource: Resource): Promise<Resource> {
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
