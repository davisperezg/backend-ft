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
      const getRole = await this.roleService.findRoleByName(
        String('SUPER ADMINISTRADOR'),
      );
      await this.userModel.insertMany([
        {
          name: 'Blas',
          lastname: 'Solorzano',
          tipDocument: 'DNI',
          nroDocument: '99999999',
          email: 'admin@dev.kematechnology.com',
          username: '99999999',
          password: passwordHashed,
          status: true,
          role: getRole._id,
        },
      ]);
    } catch (e) {
      throw new Error(`Error en ModuleService.onModuleInit ${e}`);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find({ status: true }).populate({
      path: 'role',
    });
  }

  async findAllDeleted(): Promise<User[]> {
    return this.userModel.find({ status: false }).populate({
      path: 'role',
    });
  }

  //Add a single user
  async create(createUser: User): Promise<User> {
    const { name, role, password } = createUser;

    //const findModule = await this.userModel.findOne({ name });

    if (!role) {
      //Si rol no existe
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

    const modifyData: User = {
      ...createUser,
      password: passwordHashed,
      role: getRole._id,
      status: true,
    };

    const createdUser = new this.userModel(modifyData);
    return createdUser.save();
  }

  //Delete a single user
  async delete(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.userModel.findByIdAndUpdate(id, { status: false });
      result = true;
    } catch (e) {
      //throw new Error(`Error en ProductService.deleteProductById ${e}`);
    }

    return result;
  }

  //Put a single user
  async update(id: string, bodyUser: User): Promise<User> {
    const { status, role } = bodyUser;

    if (status) {
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
  async restore(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.userModel.findByIdAndUpdate(id, { status: true });
      result = true;
    } catch (e) {
      //throw new Error(`Error en ProductService.deleteProductById ${e}`);
    }

    return result;
  }

  //find user by username
  async findUserByUsername(username: string): Promise<UserDocument> {
    return await this.userModel.findOne({ username });
  }

  //find user by id
  async findUserById(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id).populate({
      path: 'role',
      populate: [
        {
          path: 'module',
          populate: [{ path: 'menu' }, { path: 'option' }],
        },
      ],
    });
  }
}
