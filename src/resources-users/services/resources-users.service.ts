import {
  HttpException,
  HttpStatus,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ResourceService } from 'src/resource/services/resource.service';
import { RoleService } from 'src/role/services/role.service';
import { Model } from 'mongoose';
import {
  Resource_User,
  Resource_UserDocument,
} from '../schemas/resources-user';
import { resourcesByDefault, ROL_PRINCIPAL } from 'src/lib/const/consts';
import { UserService } from 'src/user/services/user.service';
import {
  CopyResource_User,
  CopyResource_UserDocument,
} from '../schemas/cp-resource-user';

@Injectable()
export class ResourcesUsersService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(CopyResource_User.name)
    private copyRuModel: Model<CopyResource_UserDocument>,
    private readonly resourceService: ResourceService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.ruModel.estimatedDocumentCount();
    if (count > 0) return;
    try {
      const findResources = await this.resourceService.findResourceByKey(
        resourcesByDefault.map((res) => res.key),
      );

      const getIdsResources = findResources.map((res) => res._id);

      setTimeout(async () => {
        const count = await this.ruModel.estimatedDocumentCount();
        if (count > 0) return;
        const getRoleOwner = await this.roleService.findRoleByName(
          String(ROL_PRINCIPAL),
        );

        const findUserByRol = await this.userService.findUserByIdRol(
          getRoleOwner._id,
        );

        await new this.ruModel({
          user: findUserByRol._id,
          resource: getIdsResources,
          status: true,
        }).save();
      }, 10000);
    } catch (e) {
      throw new Error(`Error en RUService.onModuleInit ${e}`);
    }
  }

  async findAll(): Promise<Resource_User[]> {
    const resources = await this.ruModel
      .find({ status: true })
      .populate({ path: 'resource' });
    //se usara proximamente no eliminar
    //.populate({ path: 'resources', populate: { path: 'resource' } });

    return resources;
  }

  async findOneResourceByUser(idUser: string): Promise<Resource_User[]> {
    const resourcesOfUser = await this.ruModel
      .findOne({ status: true, user: idUser as any })
      .populate({ path: 'resource' });

    const formatToFront = {
      ...resourcesOfUser,
      resource: resourcesOfUser.resource.map((res: any) => res._doc.key),
    };

    return formatToFront.resource;
  }

  //Add a single role
  async create(
    createResource: Resource_User,
    userToken: any,
  ): Promise<Resource_User> {
    const { user, resource } = createResource;

    if (!user || !resource) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `Los campos usuario y recursos son requeridos.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const findIfExisteUser = await this.userService.findUserById(String(user));
    if (!findIfExisteUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El usuario no existe.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //buscar recurso de usuario existente
    const isExistsResource = await this.ruModel.findOne({ user: user });
    if (isExistsResource) {
      const bodyExists = {
        ...createResource,
        user,
        resource,
      };

      return await this.update(isExistsResource._id, bodyExists);
    }

    //formateo el tipo de datos para string[]
    const resourceInput: string[] = Object.keys(resource).map(
      (res) => resource[res],
    );

    //busca recurso existentes por keys desde el schema resources
    const findResourcesBody = await this.resourceService.findResourceByKey(
      resourceInput,
    );

    //preparo la data
    const modifyData: Resource_User = {
      ...createResource,
      status: true,
      resource: findResourcesBody,
    };

    //inserto la data para el recurso del usuario
    const createdResource = new this.ruModel(modifyData);

    return createdResource.save();
  }

  //Put a single role
  async update(
    id: string,
    bodyUser: Resource_User,
  ): Promise<Resource_User | any> {
    const { status, user, resource } = bodyUser;

    let findResourceToData;
    //no se permite el ingreso del estado
    if (status === true || status === false) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: 'Unauthorized Exception',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    //validamos si el recurso no existe o esta inactivo
    const findRR = await this.ruModel.findById(id);

    if (!findRR) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El recurso no existe o esta inactivo.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //ejecutar codigo si existe usuario en el body
    if (user) {
      let isExistsUserinRR;

      try {
        //buscar resource existente por usuario
        isExistsUserinRR = await this.ruModel.findOne({ user });
      } catch (e) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            type: 'BAD_REQUEST',
            message: `No hay un recurso registrado con ese usuario.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      //si existe en la bd pero no coincide con el param id
      if (String(id) !== String(isExistsUserinRR._id)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            type: 'BAD_REQUEST',
            message: `El id no coincide con el usuario ingresado.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    //si no existe buscar su mismo usuario y recursos registrado
    const { user: userRegistered, resource: resourcesRegistered } = findRR;

    //si existe recursos en el body, buscar los ids
    if (resource) {
      const resourceInput: string[] = Object.keys(resource).map(
        (res) => resource[res],
      );

      findResourceToData = await this.resourceService.findResourceByKey(
        resourceInput,
      );
    }

    //si no existe recursos ni usuario en el body usar los mismo registrados
    const modifyData: Resource_User = {
      ...bodyUser,
      user: user ? user : userRegistered,
      resource: resource ? findResourceToData : resourcesRegistered,
    };

    //lo formateo para poder hacer la consulta con los registrado
    const formatRegistered = resourcesRegistered.map((res) => String(res));
    const formatSendData = findResourceToData.map((res) => String(res._id));

    //validamos si ya existe el recurso modificado en el esquema copyresource_user
    const isExistResourceModified = await this.copyRuModel.findOne({
      user: modifyData.user,
    });

    let enviarModificados = [];

    //si modificados esta vacio o no se encuentra en la bd se crea
    if (!isExistResourceModified) {
      const desactivando = formatRegistered.filter(
        (a) => !formatSendData.includes(a),
      );
      const activando = formatSendData.filter(
        (a) => !formatRegistered.includes(a),
      );
      const iranAModificados = desactivando.concat(activando);

      const findResourceToDataRU = await this.resourceService.findResourcesById(
        iranAModificados,
      );

      await new this.copyRuModel({
        status: true,
        user: modifyData.user,
        resource: findResourceToDataRU,
      }).save();
    } else {
      const formatRegisteredModifieds = isExistResourceModified.resource.map(
        (res) => String(res),
      );

      //si entrada es vacio todos los que estabn reigstrado se filtro con los modificados para obtener quienes faltan modificarse
      if (formatSendData.length === 0) {
        if (formatRegisteredModifieds.length === formatRegistered.length) {
          //validamos si los elementos registrados tienen el mismo valor con los modificados
          const modificadosExistsInRegistrado = formatRegisteredModifieds.every(
            (a) => formatRegistered.includes(a),
          );
          //si es true envia la misma data de modificados
          //si es false buscara los registros que no estan en modificados
          if (modificadosExistsInRegistrado) {
            enviarModificados = [];
          } else {
            enviarModificados = formatRegistered.filter(
              (a) => !formatRegisteredModifieds.includes(a),
            );
          }
        }

        if (formatRegisteredModifieds.length > formatRegistered.length) {
          //validamos si los elementos modificados contiene el mismo valor con los registrados
          const modificadosExistsInRegistrado = formatRegistered.every((a) =>
            formatRegisteredModifieds.includes(a),
          );

          enviarModificados = modificadosExistsInRegistrado && [];
        }

        if (formatRegistered.length > formatRegisteredModifieds.length) {
          //buscamos si los elementos registrados contiene el diferentes valores con los registrados
          enviarModificados = formatRegistered.filter(
            (a) => !formatRegisteredModifieds.includes(a),
          );
        }
      }

      if (formatSendData.length > 0) {
        if (
          formatSendData.length === formatRegisteredModifieds.length &&
          formatSendData.length === formatRegistered.length
        ) {
          const buscarIgualdadconRes = formatSendData.every((a) =>
            formatRegistered.includes(a),
          );
          const buscarIgualdadconMod = formatSendData.every((a) =>
            formatRegisteredModifieds.includes(a),
          );
          //si los datos coinciden entrada y registrados la data de modificados permanece
          if (buscarIgualdadconRes && buscarIgualdadconMod) {
            enviarModificados = [];
          }
          if (
            buscarIgualdadconRes === false &&
            buscarIgualdadconMod === false
          ) {
            enviarModificados = formatSendData.filter(
              (a) => !formatRegisteredModifieds.includes(a),
            );
          }
          if (buscarIgualdadconRes === true && buscarIgualdadconMod === false) {
            enviarModificados = formatSendData.filter(
              (a) => !formatRegisteredModifieds.includes(a),
            );
          }
          if (buscarIgualdadconRes === false && buscarIgualdadconMod === true) {
            enviarModificados = [];
          }
        } else {
          //buscamos los recursos que fueron desactivados, activados y hacemos un filtro con los recursos modificados.
          const desactivando = formatRegistered.filter(
            (a) => !formatSendData.includes(a),
          );
          const activando = formatSendData.filter(
            (a) => !formatRegistered.includes(a),
          );
          const unir = desactivando.concat(activando);
          enviarModificados = unir.filter(
            (a) => !formatRegisteredModifieds.includes(a),
          );
        }
      }

      //busca los recursos segun los id quue recibe
      const findResourceToDataRU = await this.resourceService.findResourcesById(
        formatRegisteredModifieds.concat(enviarModificados),
      );

      //enviar al esquema modificados
      const sendDataToModified: CopyResource_User = {
        status: true,
        user: modifyData.user,
        resource: findResourceToDataRU,
      };

      await this.copyRuModel.findOneAndUpdate(
        { user: sendDataToModified.user },
        {
          resource: sendDataToModified.resource,
        },
        { new: true },
      );
    }

    return await this.ruModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }
}
