import { QueryToken } from 'src/auth/dto/queryToken';
import { ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  Services_User,
  Services_UserDocument,
} from './../../services-users/schemas/services-user';
import {
  Resource_Role,
  Resource_RoleDocument,
} from './../../resources-roles/schemas/resources-role';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPassword } from 'src/lib/helpers/auth.helper';
import { RoleService } from 'src/role/services/role.service';
import { User, UserDocument } from '../schemas/user.schema';
import {
  Resource_UserDocument,
  Resource_User,
} from 'src/resources-users/schemas/resources-user';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly roleService: RoleService,
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private dataSource: DataSource,
  ) {}

  //si haz creado una proiedad en el schema y vas actulizarla en la bd con un valor en especifico usamos el siguiente código:
  // await this.userModel.updateMany(
  //   {
  //     updateResource: null,
  //   },
  //   { updateResource: false },
  // );

  async findAll(userToken: QueryToken): Promise<any[]> {
    const { tokenEntityFull } = userToken;
    let users = [];

    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        const listusers = await this.userModel.find().populate([
          {
            path: 'role',
          },
          {
            path: 'creator',
          },
        ]);

        users = listusers.filter((user) => user.role.name !== ROL_PRINCIPAL);
      } catch (e) {
        throw new HttpException(
          'Error al listar usuarios.',
          HttpStatus.NOT_FOUND,
        );
      }
    } else {
      try {
        users = await this.userModel
          .find({ creator: tokenEntityFull._id })
          .populate([
            {
              path: 'role',
            },
            {
              path: 'creator',
            },
          ]);
      } catch (e) {
        throw new HttpException(
          'Error al listar usuarios.',
          HttpStatus.NOT_FOUND,
        );
      }
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
        owner: user.creator ? user.creator.username : 'Ninguno',
        role: {
          name: user.role.name,
          _id: user.role._id,
        },
        username: user.username,
        fecha_creada: user.createdAt,
        fecha_editada: user.updatedAt,
        fecha_restaurada: user.restoredAt,
        fecha_eliminada: user.deletedAt,
      };
    });

    return formatUsers;
  }

  async changePassword(
    id: string,
    password: string,
    userToken: QueryToken,
  ): Promise<boolean> {
    const findForbidden = await this.findUserById(id);
    const { tokenEntityFull } = userToken;
    const rolToken = tokenEntityFull.role.name;

    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== tokenEntityFull.email &&
        rolToken !== ROL_PRINCIPAL)
    ) {
      throw new HttpException('Permiso denegado.', HttpStatus.UNAUTHORIZED);
    }

    let result = false;

    try {
      const passwordHashed = await hashPassword(password);
      await this.userModel.findByIdAndUpdate(
        id,
        {
          password: passwordHashed,
        },
        {
          new: true,
        },
      );
      result = true;
    } catch (e) {
      throw new HttpException(
        `Error al intentar actualizar la contraseña del usuario`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  //Add a single user
  async create(createUser: CreateUserDTO, userToken: QueryToken) {
    const { role, password, username } = createUser;
    const { tokenEntityFull } = userToken;

    const passwordHashed = await hashPassword(password);
    const getRole = await this.roleService.findRoleById(String(role));

    //Buscamos usuario existente y mandamos error
    const findUsername = await this.findUserByUsername(username);
    if (findUsername)
      throw new HttpException(
        `El usuario ${username} ya existe.`,
        HttpStatus.FOUND,
      );

    //Ni el owner ni otro usuario puede registrar a otro owner
    if (
      (tokenEntityFull.role.name !== ROL_PRINCIPAL &&
        getRole.name === ROL_PRINCIPAL) ||
      (tokenEntityFull.role.name === ROL_PRINCIPAL &&
        getRole.name === ROL_PRINCIPAL)
    ) {
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
    }

    //data a enviar para el registro de usuario
    const sendDataUser = {
      ...createUser,
      password: passwordHashed,
      role: getRole._id,
      status: true,
      creator: tokenEntityFull._id,
    };

    //crea usuario
    const createdUser = new this.userModel(sendDataUser);

    //busco a los recursos del rol para asignarlo al usuario
    const resourcesOfRol = await this.rrModel.findOne({ role: getRole._id });

    //busco los modulos del rol para asignarlo al usuario
    const modulesOfRol = await this.roleService.findModulesByOneRol(
      String(resourcesOfRol.role),
    );

    const creatUserMysql = this.userRepository.create({
      _id: String(createdUser._id),
      nombres: createdUser.name,
      apellidos: createdUser.lastname,
    });

    const _queryRunner = this.dataSource.createQueryRunner();
    //Inicia transaccion
    await _queryRunner.connect();
    await _queryRunner.startTransaction();

    try {
      //registra usuario mongo
      const userRegistered = await createdUser.save();

      //registra usuario mysql
      await this.userRepository.save(creatUserMysql);

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

      // Confirmar la transacción
      await _queryRunner.commitTransaction();

      return userRegistered;
    } catch (error) {
      // Revertir la transacción en caso de error
      await _queryRunner.rollbackTransaction();
      // Relanzar el error para que sea manejado en otro lugar
      throw new HttpException(
        `Error al intentar crear usuario.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await _queryRunner.release(); // Liberar el queryRunner
    }
  }

  //Put a single user
  async update(
    id: string,
    bodyUser: UpdateUserDTO,
    userToken: QueryToken,
  ): Promise<User> {
    const { role, username } = bodyUser;
    const { tokenEntityFull } = userToken;
    const rolToken = tokenEntityFull.role.name;
    const findForbidden = await this.findUserById(id);

    //validar que el nro de documento o email actualizados no pertenezcan a otro usuario
    const findUsername = await this.findUserByUsername(username);
    const getRoleOfBody = await this.roleService.findRoleById(String(role));

    if (
      findUsername &&
      String(findUsername._id).toLowerCase() !==
        String(findForbidden._id).toLowerCase()
    ) {
      throw new HttpException(
        'El username ya le pertenece a otro usuario registrado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //el usuario no puede actualizar otro rol a owner o si encuentra que el usuario del owner esta siendo modificado tampoco puede actualizar
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== tokenEntityFull.email &&
        rolToken !== ROL_PRINCIPAL) ||
      (getRoleOfBody.name === ROL_PRINCIPAL && rolToken !== ROL_PRINCIPAL) ||
      (getRoleOfBody.name === ROL_PRINCIPAL && rolToken === ROL_PRINCIPAL)
    ) {
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
    }

    //Creando objeto para Mongo
    const modifyData = {
      ...bodyUser,
      role: role,
      updatedBy: tokenEntityFull._id,
    };

    const _queryRunner = this.dataSource.createQueryRunner();

    //Inicia transaccion
    await _queryRunner.connect();
    await _queryRunner.startTransaction();

    try {
      //Guardamos en Mongo
      const user_updated = await this.userModel.findByIdAndUpdate(
        id,
        modifyData,
        {
          new: true,
        },
      );

      //Buscamos id para actualizar en MYSQL
      const userMYSQL = await this.userRepository.findOne({
        where: {
          _id: id,
        },
      });

      //Creados objeto para MYSQL
      this.userRepository.merge(userMYSQL, {
        nombres: modifyData.name,
        apellidos: modifyData.lastname,
      });

      //Guardamos en MYSQL
      await this.userRepository.save(userMYSQL);

      // Confirmar la transacción
      await _queryRunner.commitTransaction();

      return user_updated;
    } catch (error) {
      // Revertir la transacción en caso de error
      await _queryRunner.rollbackTransaction();
      // Relanzar el error para que sea manejado en otro lugar
      throw new HttpException(
        `Error al intentar editar usuario.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await _queryRunner.release(); // Liberar el queryRunner
    }
  }

  //Delete a single user
  async delete(id: string, user: QueryToken): Promise<boolean> {
    let result = false;
    const { tokenEntityFull } = user;
    const rolToken = tokenEntityFull.role.name;
    const findForbidden = await this.findUserById(id);

    //Ni el owner ni cualquier otro usuario puede eliminar al owner
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken === ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== tokenEntityFull.email &&
        rolToken !== ROL_PRINCIPAL)
    ) {
      throw new HttpException('Permisos denegado.', HttpStatus.CONFLICT);
    }

    const _queryRunner = this.dataSource.createQueryRunner();
    //Inicia transaccion
    await _queryRunner.connect();
    await _queryRunner.startTransaction();

    try {
      const user = await this.userModel.findByIdAndUpdate(
        id,
        {
          status: false,
          deletedAt: new Date(),
          deletedBy: tokenEntityFull._id,
        },
        { new: true },
      );

      await this.userModel.updateMany(
        { creator: user._id },
        { $set: { status: false } },
        { multi: true },
      );

      // Confirmar la transacción
      await _queryRunner.commitTransaction();

      result = true;
    } catch (e) {
      // Revertir la transacción en caso de error
      await _queryRunner.rollbackTransaction();

      throw new HttpException(
        `Error al intentar eliminar usuario.`,
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      await _queryRunner.release(); // Liberar el queryRunner
    }

    return result;
  }

  //Restore a single user
  async restore(id: string, userToken: QueryToken): Promise<boolean> {
    const { tokenEntityFull } = userToken;
    const rolToken = tokenEntityFull.role.name;
    const findForbidden = await this.findUserById(id);

    //Ni el owner ni cualquier otro usuario permite retaurar al owner
    if (
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken !== ROL_PRINCIPAL) ||
      (findForbidden.role.name === ROL_PRINCIPAL &&
        rolToken === ROL_PRINCIPAL) ||
      (findForbidden.creator.email !== tokenEntityFull.email &&
        rolToken !== ROL_PRINCIPAL)
    ) {
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
    }

    let result = false;

    const _queryRunner = this.dataSource.createQueryRunner();

    //Inicia transaccion
    await _queryRunner.connect();
    await _queryRunner.startTransaction();

    try {
      const user = await this.userModel.findByIdAndUpdate(id, {
        status: true,
        restoredAt: new Date(),
        restoredBy: tokenEntityFull._id,
      });

      await this.userModel.updateMany(
        { creator: user._id },
        { $set: { status: true } },
        { multi: true },
      );

      // Confirmar la transacción
      await _queryRunner.commitTransaction();

      result = true;
    } catch (e) {
      // Revertir la transacción en caso de error
      await _queryRunner.rollbackTransaction();

      throw new HttpException(
        `Error al intentar restaurar usuario.`,
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      await _queryRunner.release(); // Liberar el queryRunner
    }

    return result;
  }

  //find user by email
  async findUserByUsername(username: string): Promise<UserDocument> {
    try {
      return await this.userModel.findOne({ username });
    } catch (e) {
      throw new HttpException(
        `Error al intentar buscar username.`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  //find user by id
  async findUserById(id: string): Promise<UserDocument> {
    try {
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
    } catch (e) {
      throw new HttpException(
        `Error al intentar buscar usuario.`,
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
