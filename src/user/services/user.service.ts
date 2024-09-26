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
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
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
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';
import { EmpresaService } from 'src/empresa/services/empresa.service';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';
import { Types, Connection } from 'mongoose';
import { SeriesService } from 'src/series/services/series.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private readonly roleService: RoleService,
    private readonly seriesService: SeriesService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => EmpresaService))
    private empresaService: EmpresaService,
    @InjectRepository(UsersEmpresaEntity)
    private usersEmprersaRepository: Repository<UsersEmpresaEntity>,
    @InjectConnection() private readonly connection: Connection,
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

    const formatUsers = users.map(async (user) => {
      const findEmpresasAsign = await this.usersEmprersaRepository.find({
        relations: {
          establecimiento: true,
          empresa: true,
        },
        select: {
          empresa: {
            id: true,
            razon_social: true,
            ruc: true,
            estado: true,
          },
          establecimiento: {
            id: true,
            codigo: true,
            denominacion: true,
            estado: true,
          },
        },
        where: {
          usuario: {
            _id: String(user._id),
          },
        },
      });

      const reduceFindEmpresasAsign = findEmpresasAsign.reduce((acc, curr) => {
        const existingEmpresa = acc.find((acc) => acc.id === curr.empresa.id);
        if (existingEmpresa) {
          existingEmpresa.establecimientos.push({
            ...curr.establecimiento,
            idEntidad: curr.id,
            checked: true,
          });
        } else {
          const newEmpresa = {
            id: curr.empresa.id,
            ruc: curr.empresa.ruc,
            razon_social: curr.empresa.razon_social,
            estado: curr.empresa.estado,
            checked: true,
            establecimientos: [
              { ...curr.establecimiento, idEntidad: curr.id, checked: true },
            ],
          };
          acc.push(newEmpresa);
        }

        return acc;
      }, []);
      // const userMYSQL = await this.userRepository.findOne({
      //   where: {
      //     _id: String(user._id),
      //   },
      //   relations: {
      //     empresas: true,
      //   },
      //   select: {
      //     empresas: true,
      //   },
      // });

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
        //empresas: userMYSQL.empresas,
        fecha_creada: user.createdAt,
        fecha_editada: user.updatedAt,
        fecha_restaurada: user.restoredAt,
        fecha_eliminada: user.deletedAt,
        empresasAsign: reduceFindEmpresasAsign,
      };
    });

    return Promise.all(formatUsers);
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
    const { role, password, username, empresasAsign } = createUser;
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
      email: createdUser.email,
      username: createdUser.username,
    });

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      //registra usuario mongo
      const userRegistered = await createdUser.save({ session });

      await this.dataSource.transaction(async (entityManager) => {
        //registra usuario mysql
        const userRegisteredMYSQL = await entityManager.save(
          UserEntity,
          creatUserMysql,
        );

        //El owner no puede crear usuarios con empresas
        if (
          tokenEntityFull.role.name === ROL_PRINCIPAL &&
          empresasAsign &&
          empresasAsign.length > 0
        ) {
          throw new HttpException(
            'Para asignar empresas a un usuario necesitas pertecener a una.',
            HttpStatus.BAD_REQUEST,
          );
        }

        //Si el usuario que esta registrando pertenece a una empresa se registra en la tabla users_empresa
        if (
          tokenEntityFull.role.name !== ROL_PRINCIPAL &&
          empresasAsign &&
          empresasAsign.length > 0
        ) {
          if (tokenEntityFull.empresas.length > 0) {
            const searchEmpresas =
              await this.empresaService.findAllEmpresasByUserIdObject(
                tokenEntityFull._id,
              );

            for (let index = 0; index < empresasAsign.length; index++) {
              const inputEmpresa = empresasAsign[index];
              const idEmpresa = inputEmpresa.id;
              const validEmpresa = searchEmpresas.find(
                (empresa) => empresa.id === idEmpresa,
              );

              //Solo pasara empresas que le pertenece al creador del usuario
              if (!validEmpresa) {
                throw new HttpException(
                  `No es posible asignar la empresa ${inputEmpresa.razon_social}.`,
                  HttpStatus.BAD_REQUEST,
                );
              }
              //Solo se aceptara empresas con el estado "activo" = true
              if (validEmpresa.estado) {
                const establecimientos = inputEmpresa.establecimientos;
                //Si la empresa esta checked se procede a validar establecimientos
                if (inputEmpresa.checked) {
                  for (
                    let index = 0;
                    index < establecimientos.length;
                    index++
                  ) {
                    const inputEstablecimiento = establecimientos[index];
                    const idEstablecimiento = inputEstablecimiento.id;
                    const listEstablecimientos =
                      await this.empresaService.findEstablecimientosByEmpresa(
                        idEmpresa,
                      );
                    const validEstablecimiento = listEstablecimientos.find(
                      (a) => a.id === idEstablecimiento,
                    );

                    //Solo pasara establecimientos que le pertenece a la empresa del creador
                    if (!validEstablecimiento) {
                      throw new HttpException(
                        `No es posible asignar el establecimiento ${inputEstablecimiento.denominacion}. Ya que no le pertecene a la empresa ${inputEmpresa.razon_social}.`,
                        HttpStatus.BAD_REQUEST,
                      );
                    }

                    //Solo se aceptara establecimientos con el estado "activo" = true
                    if (validEstablecimiento.estado) {
                      //Una vez validado el establecimiento se procede a registrar
                      if (inputEstablecimiento.checked) {
                        const userEmpresa = this.usersEmprersaRepository.create(
                          {
                            empresa: idEmpresa,
                            usuario: userRegisteredMYSQL,
                            establecimiento: idEstablecimiento,
                          },
                        );

                        await entityManager.save(
                          UsersEmpresaEntity,
                          userEmpresa,
                        );
                      }
                      //Revisar: los establecimientos y la empresa deben
                      //tener la propiedad checked en true para que se registre
                    } else {
                      throw new HttpException(
                        `El establecimiento ${
                          inputEstablecimiento.codigo === '0000'
                            ? 'PRINCIPAL'
                            : inputEstablecimiento.codigo
                        } - ${
                          inputEstablecimiento.denominacion
                        } debe estar activo.`,
                        HttpStatus.BAD_REQUEST,
                      );
                    }
                  }
                }
              } else {
                throw new HttpException(
                  `La empresa ${inputEmpresa.razon_social} debe estar activa.`,
                  HttpStatus.BAD_REQUEST,
                );
              }
            }
          } else {
            throw new HttpException(
              'Para asignar empresas a un usuario necesitas pertecener a una.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      });

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
      await new this.ruModel(sendDataResource).save({ session });

      //crea modulos al usuario
      await new this.suModel(sendDataSu).save({ session });

      await session.commitTransaction();
      return userRegistered;
    } catch (error) {
      await session.abortTransaction();
      // Relanzar el error para que sea manejado en otro lugar
      throw new HttpException(
        `Error al intentar crear usuario. ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession();
    }
  }

  //Put a single user
  async update(
    id: string,
    bodyUser: UpdateUserDTO,
    userToken: QueryToken,
  ): Promise<User> {
    const { role, username, empresasAsign } = bodyUser;
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

    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      //Guardamos en Mongo
      const user_updated = await this.userModel.findByIdAndUpdate(
        id,
        modifyData,
        {
          new: true,
          session,
        },
      );

      await this.dataSource.transaction(async (entityManager) => {
        //Buscamos id para actualizar en MYSQL
        const userMYSQL = await this.userRepository.findOne({
          where: {
            _id: id,
          },
        });

        //El owner no puede asignar usuarios con empresas
        if (
          tokenEntityFull.role.name === ROL_PRINCIPAL &&
          empresasAsign &&
          empresasAsign.length > 0
        ) {
          throw new HttpException(
            'Para asginar empresas a un usuario necesitas pertecener a una.',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (
          tokenEntityFull.role.name !== ROL_PRINCIPAL &&
          empresasAsign &&
          empresasAsign.length > 0
        ) {
          if (tokenEntityFull.empresas.length > 0) {
            const findMyEmpresasAsign = await this.usersEmprersaRepository.find(
              {
                relations: {
                  empresa: true,
                  establecimiento: true,
                },
                where: {
                  usuario: {
                    _id: String(userMYSQL._id),
                  },
                },
              },
            );

            const searchEmpresas =
              await this.empresaService.findAllEmpresasByUserIdObject(
                tokenEntityFull._id,
              );

            for (let index = 0; index < empresasAsign.length; index++) {
              const inputEmpresa = empresasAsign[index];
              const idEmpresa = inputEmpresa.id;

              const validEmpresa = searchEmpresas.find(
                (empresa) => empresa.id === idEmpresa,
              );

              //Solo pasara empresas que le pertenece al creador del usuario
              if (!validEmpresa) {
                throw new HttpException(
                  `No es posible asignar la empresa ${inputEmpresa.razon_social}.`,
                  HttpStatus.BAD_REQUEST,
                );
              }

              //Solo se aceptara empresas con el estado "activo" = true
              if (validEmpresa.estado) {
                const establecimientos = inputEmpresa.establecimientos;
                //Si la empresa esta checked se procede a validar establecimientos
                if (inputEmpresa.checked) {
                  for (
                    let index = 0;
                    index < establecimientos.length;
                    index++
                  ) {
                    const inputEstablecimiento = establecimientos[index];
                    const idEstablecimiento = inputEstablecimiento.id;
                    const listEstablecimientos =
                      await this.empresaService.findEstablecimientosByEmpresa(
                        idEmpresa,
                      );
                    const validEstablecimiento = listEstablecimientos.find(
                      (a) => a.id === idEstablecimiento,
                    );

                    //Solo pasara establecimientos que le pertenece a la empresa del creador
                    if (!validEstablecimiento) {
                      throw new HttpException(
                        `No es posible asignar el establecimiento ${inputEstablecimiento.denominacion}. Ya que no le pertecene a la empresa ${inputEmpresa.razon_social}.`,
                        HttpStatus.BAD_REQUEST,
                      );
                    }

                    //Solo se aceptara establecimientos con el estado "activo" = true
                    if (validEstablecimiento.estado) {
                      const findEntidadExisting = findMyEmpresasAsign.find(
                        (a) =>
                          a.empresa.id === idEmpresa &&
                          a.establecimiento.id === inputEstablecimiento.id,
                      );

                      //Si ya existe un establecimiento agregado y esta checked no se agrega
                      if (!findEntidadExisting) {
                        //Si no existe un establecimiento agregado y esta checked se agrega
                        if (inputEstablecimiento.checked) {
                          const userEmpresa =
                            this.usersEmprersaRepository.create({
                              empresa: idEmpresa,
                              usuario: userMYSQL,
                              establecimiento: idEstablecimiento,
                            });
                          await entityManager.save(
                            UsersEmpresaEntity,
                            userEmpresa,
                          );
                        }
                        //Revisar: los establecimientos y la empresa deben
                        //tener la propiedad checked en true para que se registre
                      } else {
                        //Si ya existe un establecimiento agregado y esta unchecked se elimina
                        if (!inputEstablecimiento.checked) {
                          await entityManager.delete(
                            UsersEmpresaEntity,
                            inputEstablecimiento.idEntidad,
                          );
                        }
                      }
                    } else {
                      throw new HttpException(
                        `El establecimiento ${
                          inputEstablecimiento.codigo === '0000'
                            ? 'PRINCIPAL'
                            : inputEstablecimiento.codigo
                        } - ${
                          inputEstablecimiento.denominacion
                        } debe estar activo.`,
                        HttpStatus.BAD_REQUEST,
                      );
                    }
                  }
                } else {
                  //Si desactiva la empresa se eliminan todos los establecimientos
                  for (
                    let index = 0;
                    index < establecimientos.length;
                    index++
                  ) {
                    const inputEstablecimiento = establecimientos[index];
                    if (inputEstablecimiento.idEntidad) {
                      await entityManager.delete(
                        UsersEmpresaEntity,
                        inputEstablecimiento.idEntidad,
                      );
                    }
                  }
                }
              } else {
                throw new HttpException(
                  `La empresa ${inputEmpresa.razon_social} debe estar activa.`,
                  HttpStatus.BAD_REQUEST,
                );
              }
            }
          } else {
            throw new HttpException(
              'Para asignar empresas a un usuario necesitas pertecener a una.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        //Creados objeto para MYSQL
        this.userRepository.merge(userMYSQL, {
          nombres: modifyData.name,
          apellidos: modifyData.lastname,
        });

        //Guardamos en MYSQL
        await entityManager.save(UserEntity, userMYSQL);
      });

      // Confirmar la transacción
      await session.commitTransaction();

      return user_updated;
    } catch (error) {
      // Revertir la transacción en caso de error
      await session.abortTransaction();
      // Relanzar el error para que sea manejado en otro lugar
      throw new HttpException(
        `Error al intentar editar usuario. ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await session.endSession(); // Liberar el queryRunner
    }
  }

  //Delete a single user
  async delete(idPadre: string, user: QueryToken): Promise<boolean> {
    let result = false;
    const { tokenEntityFull } = user;
    const rolToken = tokenEntityFull.role.name;
    const findForbidden = await this.findUserById(idPadre);

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

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const users = await this.userModel.find();
        const descendientes = this.obtenerDescendientes(users, idPadre);
        const padreWithDescendientes = descendientes.concat({
          _id: new Types.ObjectId(idPadre),
        });
        for (let index = 0; index < padreWithDescendientes.length; index++) {
          const user = padreWithDescendientes[index];

          await this.userModel.findOneAndUpdate(
            user,
            {
              status: false,
              deletedAt: new Date(),
              deletedBy: tokenEntityFull._id,
            },
            { new: true, session },
          );
          result = true;
        }
      });
    } catch (e) {
      throw new HttpException(
        `Error al intentar eliminar usuario.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    await session.endSession();
    return result;
  }

  //Restore a single user
  async restore(idPadre: string, userToken: QueryToken): Promise<boolean> {
    const { tokenEntityFull } = userToken;
    const rolToken = tokenEntityFull.role.name;
    const findForbidden = await this.findUserById(idPadre);

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

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const users = await this.userModel.find();
        const descendientes = this.obtenerDescendientes(users, idPadre);
        const padreWithDescendientes = descendientes.concat({
          _id: new Types.ObjectId(idPadre),
        });

        for (let index = 0; index < padreWithDescendientes.length; index++) {
          const user = padreWithDescendientes[index];
          await this.userModel.findByIdAndUpdate(
            user,
            {
              status: true,
              restoredAt: new Date(),
              restoredBy: tokenEntityFull._id,
            },
            { new: true },
          );
        }

        result = true;
      });
    } catch (e) {
      throw new HttpException(
        `Error al intentar restaurar usuario.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    await session.endSession();
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
  async findUserById(id: string): Promise<any> {
    try {
      const user: any = await this.userModel.findById(id).populate([
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

      const usermysql = await this.userRepository.findOne({
        where: {
          _id: String(id),
        },
      });

      let empresamysql: EmpresaEntity[];

      if (usermysql) {
        //user
        const usermysql2 = await this.usersEmprersaRepository.find({
          relations: {
            empresa: {
              configsEmpresa: true,
              establecimientos: {
                configsEstablecimiento: true,
              },
              tipodoc_empresa: true,
            },
          },
          where: {
            usuario: {
              id: usermysql.id,
            },
          },
        });
        //console.log('usermysql', usermysql);
        //user part
        empresamysql = await this.empresaService.findAllEmpresasByUserId(
          usermysql.id,
        );
        //console.log('empresamysql', empresamysql);
        const myEmpresas = empresamysql ?? usermysql2;

        //console.log(user._doc.empresa);
        const empresas = myEmpresas.map(async (emp) => {
          const testseries = await this.seriesService.listSeriesByIdEmpresa(
            emp.id,
          );
          return {
            ...emp,
            establecimientos: testseries.establecimientos,
          };
        });

        user._doc.empresas = await Promise.all(empresas);
        //user._doc.empresa.establecimientos = testseries.establecimientos;
      } else {
        user._doc.empresas = null;
      }

      return user;
    } catch (e) {
      throw new HttpException(
        `Error al intentar buscar usuario.`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  //buscar usuario en mysql
  async findOneUserById_MYSQL(idUsuario: number) {
    return await this.userRepository.findOne({
      where: {
        id: idUsuario,
      },
    });
  }

  //buscar usuario x _id en mysql
  async findOneUserByObjectId(_idUsuario: string) {
    return await this.userRepository.findOne({
      where: {
        _id: _idUsuario,
      },
    });
  }

  //Metodo para asginar empresas a un usuario
  async listToAsignEmpresasByIdPartner(id: string) {
    const empresas = await this.empresaService.findAllEmpresasByUserIdObject(
      id,
    );
    return empresas;
  }

  //Metodo para buscar usuarios al agregar empresa
  async findUsersToEmpresa(userToken: QueryToken) {
    const { tokenEntityFull } = userToken;

    try {
      const users = await this.userModel.find({
        creator: tokenEntityFull._id,
      });

      const userMap = users.map(async (usu) => {
        const usuMysql = await this.userRepository.findOne({
          where: {
            _id: String(usu._id),
          },
        });
        return {
          id: usuMysql.id,
          nombres: usu.name,
          apellidos: usu.lastname,
          nombreCompleto: usu.name + ' ' + usu.lastname,
          correo: usu.email,
          usuario: usu.username,
          estado: usu.status,
        };
      });
      return await Promise.all(userMap);
    } catch (e) {
      throw new HttpException(
        'Ocurrio un error al intentar listar los usuarios UserService.findUsersToEmpresa.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  obtenerDescendientes = (usuarios: UserDocument[], idPadre: string) => {
    const descendientes = usuarios
      .filter((usuario) => String(usuario.creator) === String(idPadre))
      .flatMap((descendiente) => [
        {
          _id: descendiente._id,
        },
        ...this.obtenerDescendientes(usuarios, descendiente._id),
      ]);

    return descendientes;
  };
}
