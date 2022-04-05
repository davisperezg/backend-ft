import { ResourcesRolesService } from 'src/resources-roles/services/resources-roles.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPassword } from 'src/lib/helpers/auth.helper';
import { RoleService } from 'src/role/services/role.service';
import { User, UserDocument } from '../schemas/user.schema';
import { ResourceService } from 'src/resource/services/resource.service';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly roleService: RoleService, //@InjectModel('Role') private readonly roleModel: Model<RoleDocument>, //@InjectModel('User') private readonly userModel: Model<UserDocument>,
    private readonly resourceService: ResourceService,
    private readonly rrService: ResourcesRolesService,
  ) {}

  async onApplicationBootstrap() {
    //si haz creado una proiedad en el schema y vas actulizarla en la bd con un valor en especifico usamos el siguiente código:

    // await this.userModel.updateMany(
    //   {
    //     updateResource: null,
    //   },
    //   { updateResource: false },
    // );

    const count = await this.userModel.estimatedDocumentCount();

    if (count > 0) return;

    try {
      const passwordHashed = await hashPassword('admin123');

      const getRole = await this.roleService.findRoleByName(String('OWNER'));

      setTimeout(async () => {
        const count = await this.userModel.estimatedDocumentCount();

        if (count > 0) return;

        const resourcesOfCreator = await this.rrService.findOneResourceByRol(
          getRole._id,
        );

        await this.userModel.insertMany([
          {
            name: 'El',
            lastname: 'Duenio',
            tipDocument: 'DNI',
            nroDocument: '99999999',
            email: 'admin@admin.com',
            resource: resourcesOfCreator.resource,
            password: passwordHashed,
            status: true,
            role: getRole._id,
            creator: null,
          },
        ]);
      }, 6000);
    } catch (e) {
      throw new Error(`Error en UserService.onApplicationBootstrap ${e}`);
    }
  }

  async findAll(userToken: any): Promise<any[]> {
    const { findUser } = userToken;
    let users = [];
    if (findUser.role.name === 'OWNER') {
      const listusers = await this.userModel.find().populate([
        {
          path: 'role',
        },
        {
          path: 'creator',
        },
      ]);
      users = listusers.filter((user) => user.role.name !== 'OWNER');
    } else {
      users = await this.userModel.find({ creator: findUser._id }).populate([
        {
          path: 'role',
        },
        {
          path: 'creator',
        },
      ]);
    }

    const formatUsers = users.map((user) => {
      return {
        _id: user._id,
        name: user.name,
        lastname: user.lastname,
        fullname: user.name + ' ' + user.lastname,
        tipDocument: user.tipDocument,
        nroDocument: user.nroDocument,
        status: user.status,
        email: user.email,
        owner: user.creator
          ? user.creator.name + ' ' + user.creator.lastname
          : 'Ninguno',
        role: user.role.name,
      };
    });

    return formatUsers;
  }

  async findAllDeleted(): Promise<User[]> {
    return this.userModel.find({ status: false }).populate({
      path: 'role',
    });
  }

  async changePassword(
    id: string,
    data: { password: string },
    userToken: any,
  ): Promise<boolean> {
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);
    const { findUser } = userToken;
    const rolToken = findUser.role.name;

    if (
      (findForbidden.role.name === 'OWNER' && rolToken !== 'OWNER') ||
      (findForbidden.role.name === 'SUPER ADMINISTRADOR' &&
        rolToken !== 'OWNER') ||
      (findForbidden.creator.email !== findUser.email && rolToken !== 'OWNER')
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let result = false;
    const { password } = data;
    try {
      const passwordHashed = await hashPassword(password);
      await this.userModel.findByIdAndUpdate(
        id,
        { password: passwordHashed },
        {
          new: true,
        },
      );
      result = true;
    } catch (e) {
      throw new Error(`Error en UserService.changePassword ${e}`);
    }
    return result;
  }

  //Add a single user
  async create(createUser: User, userToken: any): Promise<User> {
    const { email, role, password, nroDocument } = createUser;
    const { findUser } = userToken;

    const findEmailExists = await this.userModel.findOne({ email });
    const findNroExists = await this.userModel.findOne({ nroDocument });
    //verifica si existe el email
    if (findEmailExists) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'No puedes crear un email ya registrado.',
        },
        HttpStatus.CONFLICT,
      );
    }

    //verifica si existe el email
    if (findNroExists) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'No puedes crear un Nro. de documento ya registrado.',
        },
        HttpStatus.CONFLICT,
      );
    }

    //Si rol no existe
    if (!role) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo rol.',
        },
        HttpStatus.CONFLICT,
      );
    }
    const passwordHashed = await hashPassword(password);
    const getRole = await this.roleService.findRoleById(String(role));

    //Solo el owner puede regisrar otro owner y otro sa, si el token detecta que no es owner se valida y bota error
    if (
      (findUser.role.name !== 'OWNER' && getRole.name === 'OWNER') ||
      (findUser.role.name !== 'OWNER' && getRole.name === 'SUPER ADMINISTRADOR')
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // const getRoleToResources = await this.roleService.findRoleByName(
    //   String(findUser.role.name),
    // );
    const resourcesOfCreator = await this.rrService.findOneResourceByRol(
      getRole._id,
    );

    const getIdsOfResources = resourcesOfCreator.resource.map(
      (res: any) => res._id,
    );

    const modifyData: User = {
      ...createUser,
      password: passwordHashed,
      role: getRole._id,
      status: true,
      creator: findUser._id,
      resource: getIdsOfResources,
    };

    const createdUser = new this.userModel(modifyData);
    return createdUser.save();
  }

  //Delete a single user
  async delete(id: string, user: any): Promise<boolean> {
    let result = false;
    const { findUser } = user;
    const userToken = findUser.role.name;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    if (
      (findForbidden.role.name === 'OWNER' && userToken !== 'OWNER') ||
      (findForbidden.role.name === 'SUPER ADMINISTRADOR' &&
        userToken !== 'OWNER') ||
      (findForbidden.creator.email !== findUser.email && userToken !== 'OWNER')
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const user = await this.userModel.findByIdAndUpdate(
        id,
        { status: false },
        { new: true },
      );
      await this.userModel.updateMany(
        { creator: user._id },
        { $set: { status: false } },
        { multi: true },
      );
      result = true;
    } catch (e) {
      throw new Error(`Error en UserService.delete ${e}`);
    }

    return result;
  }

  //Put a single user
  async update(id: string, bodyUser: User, userToken: any): Promise<User> {
    const { status, role, password, resource } = bodyUser;
    const { findUser } = userToken;
    const rolToken = findUser.role.name;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    if (
      (findForbidden.role.name === 'OWNER' && rolToken !== 'OWNER') ||
      (findForbidden.role.name === 'SUPER ADMINISTRADOR' &&
        rolToken !== 'OWNER') ||
      (findForbidden.creator.email !== findUser.email && userToken !== 'OWNER')
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (status === true || status === false || password) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const getRole = await this.roleService.findRoleByName(String(role));

    const resourceArrayOfString = Object.keys(resource).map(
      (res) => resource[res],
    );

    const getIdsOfResource = await this.resourceService.findResourceByKey(
      resourceArrayOfString,
    );

    const modifyData: User = {
      ...bodyUser,
      role: getRole._id,
      resource: getIdsOfResource,
    };

    return await this.userModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }

  //Restore a single user
  async restore(id: string, userToken: any): Promise<boolean> {
    const { findUser } = userToken;
    const rolToken = findUser.role.name;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    if (
      (findForbidden.role.name === 'OWNER' && rolToken !== 'OWNER') ||
      (findForbidden.role.name === 'SUPER ADMINISTRADOR' &&
        rolToken !== 'OWNER') ||
      (findForbidden.creator.email !== findUser.email && rolToken !== 'OWNER')
    ) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let result = false;

    try {
      const user = await this.userModel.findByIdAndUpdate(id, { status: true });

      await this.userModel.updateMany(
        { creator: user._id },
        { $set: { status: true } },
        { multi: true },
      );

      result = true;
    } catch (e) {
      throw new Error(`Error en UserService.restore ${e}`);
    }

    return result;
  }

  //find user by email
  async findUserByUsername(email: string): Promise<UserDocument> {
    return await this.userModel.findOne({ email });
  }

  //find user by id
  async findUserById(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id).populate([
      {
        path: 'role',
        populate: [
          {
            path: 'module',
            populate: [{ path: 'menu' }],
          },
        ],
      },
      {
        path: 'creator',
        populate: {
          path: 'role',
          populate: {
            path: 'module',
          },
        },
      },
    ]);
  }

  //find user by nroDocument
  async findUserByNroDocument(nro: string): Promise<UserDocument | any> {
    const user = await this.userModel.findOne({ nroDocument: nro }).populate([
      {
        path: 'role',
        populate: [
          {
            path: 'module',
            populate: [{ path: 'menu' }],
          },
        ],
      },
      {
        path: 'resource',
      },
      {
        path: 'creator',
        populate: {
          path: 'role',
          populate: {
            path: 'module',
          },
        },
      },
    ]);

    const formatUsers = {
      _id: user._id,
      name: user.name,
      lastname: user.lastname,
      fullname: user.name + ' ' + user.lastname,
      tipDocument: user.tipDocument,
      nroDocument: user.nroDocument,
      status: user.status,
      email: user.email,
      owner: user.creator
        ? user.creator.name + ' ' + user.creator.lastname
        : 'Ninguno',
      role: user.role.name,
      roleId: (<any>user.role)._id,
      resource: user.resource.map((res) => res.name),
    };

    return formatUsers;
  }
}
