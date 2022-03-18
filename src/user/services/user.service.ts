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

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly roleService: RoleService, //@InjectModel('Role') private readonly roleModel: Model<RoleDocument>, //@InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.userModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      const passwordHashed = await hashPassword('admin123');
      const getRole = await this.roleService.findRoleByName(String('OWNER'));
      await this.userModel.insertMany([
        {
          name: 'El',
          lastname: 'Duenio',
          tipDocument: 'DNI',
          nroDocument: '99999999',
          email: 'admin@dev.elduenio.com',
          username: '99999999',
          password: passwordHashed,
          status: true,
          role: getRole._id,
          creator: null,
        },
      ]);
    } catch (e) {
      throw new Error(`Error en UserService.onApplicationBootstrap ${e}`);
    }
  }

  async findAll(userToken: any): Promise<User[]> {
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

    return users;
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
      (findForbidden.creator.username !== findUser.username &&
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
    const { name, role, password } = createUser;
    const { findUser } = userToken;

    //Si rol no existe
    if (!role) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Role is requerid',
        },
        HttpStatus.CONFLICT,
      );
    }
    const passwordHashed = await hashPassword(password);

    const getRole = await this.roleService.findRoleByName(String(role));

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

    const modifyData: User = {
      ...createUser,
      password: passwordHashed,
      role: getRole._id,
      status: true,
      creator: findUser._id,
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
      (findForbidden.creator.username !== findUser.username &&
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
    const { status, role, password } = bodyUser;
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
      (findForbidden.creator.username !== findUser.username &&
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

    const modifyData: User = {
      ...bodyUser,
      role: getRole._id,
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
      (findForbidden.creator.username !== findUser.username &&
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

  //find user by username
  async findUserByUsername(username: string): Promise<UserDocument> {
    return await this.userModel.findOne({ username });
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
}
