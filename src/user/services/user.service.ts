import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  Services_User,
  Services_UserDocument,
} from './../../services-users/schemas/services-user';
import {
  Resource_Role,
  Resource_RoleDocument,
} from './../../resources-roles/schemas/resources-role';
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
import {
  Resource_UserDocument,
  Resource_User,
} from 'src/resources-users/schemas/resources-user';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly roleService: RoleService,
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
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

      const getRole = await this.roleService.findRoleByName(
        String(ROL_PRINCIPAL),
      );

      setTimeout(async () => {
        const count = await this.userModel.estimatedDocumentCount();

        if (count > 0) return;

        await this.userModel.insertMany([
          {
            name: 'DAVIS KEINER',
            lastname: 'PEREZ GUZMAN',
            tipDocument: 'DNI',
            nroDocument: '99999999',
            email: 'admin@admin.com.pe',
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
    if (findUser.role === ROL_PRINCIPAL) {
      const listusers = await this.userModel.find().populate([
        {
          path: 'role',
        },
        {
          path: 'creator',
        },
      ]);
      users = listusers.filter((user) => user.role.name !== ROL_PRINCIPAL);
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
    return await this.userModel.find({ status: false }).populate({
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
    const rolToken = findUser.role;

    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== findUser.email &&
        rolToken !== ROL_PRINCIPAL)
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
        HttpStatus.BAD_REQUEST,
      );
    }

    //verifica si existe el nro documento
    if (findNroExists) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'No puedes crear un Nro. de documento ya registrado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //Si rol no existe
    if (!role) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo Rol.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    //Si nro no existe
    if (!nroDocument) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo Nro de documento.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    //Si email no existe
    if (!email) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo Email.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const passwordHashed = await hashPassword(password);
    const getRole = await this.roleService.findRoleById(String(role));

    //Ni el owner ni otro usuario puede registrar a otro owner
    if (
      (findUser.role !== ROL_PRINCIPAL && getRole.name === ROL_PRINCIPAL) ||
      (findUser.role === ROL_PRINCIPAL && getRole.name === ROL_PRINCIPAL)
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

    //data a enviar para el registro de usuario
    const sendDataUser: User = {
      ...createUser,
      password: passwordHashed,
      role: getRole._id,
      status: true,
      creator: findUser._id,
    };

    //crea usuario
    const createdUser = new this.userModel(sendDataUser);

    //busco a los recursos del rol para asignarlo al usuario
    const resourcesOfRol = await this.rrModel.findOne({ role: getRole._id });

    //busco los modulos del rol para asignarlo al usuario
    const modulesOfRol = await this.roleService.findModulesByOneRol(
      String(resourcesOfRol.role),
    );

    //data a enviar para el recurso del usuario
    const sendDataResource: Resource_User = {
      status: true,
      resource: resourcesOfRol?.resource || [],
      user: createdUser._id,
    };

    const sendDataSu: Services_User = {
      status: true,
      user: createdUser._id,
      module: modulesOfRol.module,
    };

    //crea recursos al usuario
    await new this.ruModel(sendDataResource).save();

    //crea modulos al usuario
    await new this.suModel(sendDataSu).save();

    return createdUser.save();
  }

  //Delete a single user
  async delete(id: string, user: any): Promise<boolean> {
    let result = false;
    const { findUser } = user;
    const rolToken = findUser.role;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    //Ni el owner ni cualquier otro usuario puede eliminar al owner
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken === ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== findUser.email &&
        rolToken !== ROL_PRINCIPAL)
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
    const { status, role, password, nroDocument, email } = bodyUser;
    const { findUser } = userToken;
    const rolToken = findUser.role;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    //Si nro no existe
    if (!nroDocument) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo Nro de documento.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    //Si email no existe
    if (!email) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Completar el campo Email.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //validar que el nro de documento o email actualizados no pertenezcan a otro usuario
    const findNroDocument = await this.userModel.findOne({ nroDocument });
    const findEmail = await this.userModel.findOne({ email });
    const getRoleOfBody = await this.roleService.findRoleById(String(role));
    if (
      findNroDocument &&
      String(findNroDocument._id).toLowerCase() !==
        String(findForbidden._id).toLowerCase()
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message:
            'El nro de documento ya le pertenece a otro usuario registrado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      findEmail &&
      String(findEmail._id).toLowerCase() !==
        String(findForbidden._id).toLowerCase()
    ) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message:
            'El username o email ya le pertenece a otro usuario registrado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //el usuario no puede actualizar otro rol a owner o si encuentra que el usuario del owner esta siendo modificado tampoco puede actualizar
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== findUser.email &&
        rolToken !== ROL_PRINCIPAL) ||
      (getRoleOfBody.name === ROL_PRINCIPAL && rolToken !== ROL_PRINCIPAL) ||
      (getRoleOfBody.name === ROL_PRINCIPAL && rolToken === ROL_PRINCIPAL)
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

    const modifyData: User = {
      ...bodyUser,
      role: role,
    };

    return await this.userModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }

  //Restore a single user
  async restore(id: string, userToken: any): Promise<boolean> {
    const { findUser } = userToken;
    const rolToken = findUser.role;
    const findForbidden = await this.userModel.findById(id).populate([
      {
        path: 'role',
      },
      {
        path: 'creator',
      },
    ]);

    //Ni el owner ni cualquier otro usuario permite retaurar al owner
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken === ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== findUser.email &&
        rolToken !== ROL_PRINCIPAL)
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
  async findUserByCodApi(nro: string): Promise<UserDocument | any> {
    const user = await this.userModel.findById(nro).populate([
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
    };

    return formatUsers;
  }

  async findUserByIdRol(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      role: id as any,
    });

    return user;
  }
}
