import { MOD_PRINCIPAL } from 'src/lib/const/consts';
import {
  CopyServices_User,
  CopyServicesDocument,
} from './../schemas/cp-services-user';
import {
  Services_User,
  Services_UserDocument,
} from './../schemas/services-user';
import {
  Inject,
  forwardRef,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from 'src/user/services/user.service';
import { ModuleService } from 'src/module/services/module.service';

@Injectable()
export class ServicesUsersService {
  constructor(
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ModuleService))
    private readonly moduleService: ModuleService,
    @InjectModel(CopyServices_User.name)
    private copySuModel: Model<CopyServicesDocument>,
  ) {}

  async findModulesByUser(
    idUser: string,
  ): Promise<Services_UserDocument[] | any> {
    const modulesOfUser = await this.suModel
      .findOne({ status: true, user: idUser as any })
      .populate({ path: 'module', populate: { path: 'menu' } });

    const formatToFront =
      modulesOfUser?.module.map((res: any) => ({
        _id: res._id,
        name: res.name,
        menus: res.menu.map((men) => ({
          _id: men._id,
          name: men.name,
          link: men.link,
        })),
        status: res.status,
      })) || [];

    return formatToFront;
  }

  //Add a single module_user
  async create(createSU: Services_User): Promise<Services_UserDocument> {
    const { user, module } = createSU;

    if (!user || !module) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `Los campos usuario y modulos son requeridos.`,
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

    //buscar modulos de usuario existente
    const isExistsSU = await this.suModel.findOne({ user: user });
    if (isExistsSU) {
      const bodyExists = {
        ...createSU,
        user,
        module,
      };

      return await this.update(isExistsSU._id, bodyExists);
    }

    //formateo el tipo de datos para string[]
    const moduleInput: string[] = Object.keys(module).map((res) => module[res]);

    //busca modulos existentes por ids desde el schema modules
    const findModulesBody = await this.moduleService.findModulesIds(
      moduleInput,
    );

    //preparo la data
    const modifyData: Services_User = {
      ...createSU,
      status: true,
      module: findModulesBody,
    };

    //inserto la data para el modulo del usuario
    const createdResource = new this.suModel(modifyData);

    return createdResource.save();
  }

  async update(
    id: string,
    bodySU: Services_User,
  ): Promise<Services_User | any> {
    const { status, user, module: modulesBody } = bodySU;

    let findServiceToData;
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

    //validamos si el servicio no existe o esta inactivo
    const findSU = await this.suModel.findById(id);

    if (!findSU) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: `El servicio no existe o esta inactivo.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    //ejecutar codigo si existe usuario en el body
    if (user) {
      let isExistsUserinSU;

      try {
        //buscar servicio existente por usuario
        isExistsUserinSU = await this.suModel.findOne({ user });
      } catch (e) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            type: 'BAD_REQUEST',
            message: `No hay un servicio registrado con ese usuario.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      //si existe en la bd pero no coincide con el param id
      if (String(id) !== String(isExistsUserinSU._id)) {
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

    const arrayToString: string[] = Object.keys(modulesBody).map(
      (mod) => modulesBody[mod],
    );
    const findModules = await this.moduleService.findModulesIds(arrayToString);
    const isExisteModuleASP = findModules.some((a) => a.name === MOD_PRINCIPAL);

    if (isExisteModuleASP) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          type: 'UNAUTHORIZED',
          message: `Unauthorized Exception`,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    //si no existe buscar su mismo usuario y serivicio registrado
    const { user: userRegistered, module: servicesRegistered } = findSU;

    //si existe servicios en el body, buscar los ids
    if (modulesBody) {
      const servicesInput: string[] = Object.keys(modulesBody).map(
        (res) => modulesBody[res],
      );

      findServiceToData = await this.moduleService.findModulesIds(
        servicesInput,
      );
    }

    //si no existe servicios ni usuario en el body usar los mismo registrados
    const modifyData: Services_User = {
      ...bodySU,
      user: user ? user : userRegistered,
      module: modulesBody ? findServiceToData : servicesRegistered,
    };

    //lo formateo para poder hacer la consulta con los registrado
    const formatRegistered = servicesRegistered.map((res) => String(res));
    const formatSendData = findServiceToData.map((res) => String(res._id));

    //validamos si ya existe el recurso modificado en el esquema copyresource_user
    const isExistServicesModified = await this.copySuModel.findOne({
      user: modifyData.user,
    });

    let enviarModificados = [];

    //si modificados esta vacio o no se encuentra en la bd se crea
    if (!isExistServicesModified) {
      const desactivando = formatRegistered.filter(
        (a) => !formatSendData.includes(a),
      );
      const activando = formatSendData.filter(
        (a) => !formatRegistered.includes(a),
      );
      const iranAModificados = desactivando.concat(activando);

      const findResourceToDataRU = await this.moduleService.findModulesIds(
        iranAModificados,
      );

      await new this.copySuModel({
        status: true,
        user: modifyData.user,
        module: findResourceToDataRU,
      }).save();
    } else {
      const formatRegisteredModifieds = isExistServicesModified.module.map(
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
      const finServicesToDataSU = await this.moduleService.findModulesIds(
        formatRegisteredModifieds.concat(enviarModificados),
      );

      //enviar al esquema modificados
      const sendDataToModified: CopyServices_User = {
        status: true,
        user: modifyData.user,
        module: finServicesToDataSU,
      };

      await this.copySuModel.findOneAndUpdate(
        { user: sendDataToModified.user },
        {
          module: sendDataToModified.module,
        },
        { new: true },
      );
    }

    return await this.suModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }
}
