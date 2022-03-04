import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Resource, ResourceDocument } from '../schemas/resource.schema';
import { Model } from 'mongoose';
import { RoleService } from 'src/role/services/role.service';

@Injectable()
export class ResourceService {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly roleService: RoleService,
  ) {}

  async delete(id: string) {
    return await this.resourceModel.findByIdAndDelete(id);
  }

  async findAll(): Promise<Resource[]> {
    return await this.resourceModel.find({ status: true });
  }

  //Add a single role
  async create(createResource: Resource): Promise<Resource> {
    // const { role } = createResource;

    // const roleInput = String(role);

    // //busca rol
    // const { _id: idRole, name: nameRole } =
    //   await this.roleService.findRoleByName(roleInput);

    // //buscar rol existente en el recurso
    // const isExists = await this.resourceModel.findOne({ role: idRole });
    // if (isExists) {
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.BAD_REQUEST,
    //       type: 'BAD_REQUEST',
    //       message: `Ya existe un recurso para el rol ${nameRole}.`,
    //     },
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // const modifyData: Resource = {
    //   ...createResource,
    //   status: true,
    //   role: idRole,
    // };

    const modifyData: Resource = {
      ...createResource,
      status: true,
    };

    const createdResource = new this.resourceModel(modifyData);
    return createdResource.save();
  }

  //Put a single role
  async update(id: string, bodyRole: Resource): Promise<Resource> {
    // const { status, role } = bodyRole;
    // let findRole;

    // //no se permite el ingreso del estado
    // if (status === true || status === false) {
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.UNAUTHORIZED,
    //       type: 'UNAUTHORIZED',
    //       message: 'Unauthorized Exception',
    //     },
    //     HttpStatus.UNAUTHORIZED,
    //   );
    // }

    // //validamos si el recurso no existe o esta inactivo
    // const findResource = await this.resourceModel.findById(id);
    // if (!findResource) {
    //   throw new HttpException(
    //     {
    //       status: HttpStatus.BAD_REQUEST,
    //       type: 'BAD_REQUEST',
    //       message: `El recurso no existe o esta inactivo.`,
    //     },
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // //ejecutar codigo si existe rol en el body
    // if (role) {
    //   const roleInput = String(role);
    //   //busca rol
    //   findRole = await this.roleService.findRoleByName(roleInput);

    //   //buscar rol existente en el recurso
    //   const isExists = await this.resourceModel.findOne({ role: findRole._id });

    //   if (String(isExists._id) !== id) {
    //     throw new HttpException(
    //       {
    //         status: HttpStatus.BAD_REQUEST,
    //         type: 'BAD_REQUEST',
    //         message: `El id no coincide con el rol ingresado.`,
    //       },
    //       HttpStatus.BAD_REQUEST,
    //     );
    //   }
    // }

    // //si no existe buscar su mismo rol registrado
    // const { role: roleRegistered } = await this.resourceModel.findOne({
    //   _id: id,
    // });

    // //enviar data
    // const modifyData: Resource = {
    //   ...bodyRole,
    //   role: role ? findRole._id : roleRegistered,
    // };

    return await this.resourceModel.findByIdAndUpdate(id, bodyRole, {
      new: true,
    });
  }
}
