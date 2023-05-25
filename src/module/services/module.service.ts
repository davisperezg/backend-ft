import { MOD_PRINCIPAL, ROL_PRINCIPAL } from 'src/lib/const/consts';
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Module, ModuleDocument } from '../schemas/module.schema';
import { Model } from 'mongoose';
import { MenuService } from 'src/menu/services/menu.service';
import { RoleDocument } from 'src/role/schemas/role.schema';
import { ServicesUsersService } from 'src/services-users/services/services-users.service';
import { UserService } from 'src/user/services/user.service';
import { QueryToken } from 'src/auth/dto/queryToken';
import { CreateModuleDTO } from '../dto/create-module';
import { UpdateModuleDTO } from '../dto/update-module';

@Injectable()
export class ModuleService {
  constructor(
    @InjectModel(Module.name) private moduleModel: Model<ModuleDocument>,
    @InjectModel('Role') private roleModel: Model<RoleDocument>,
    private readonly menuService: MenuService,
    @Inject(forwardRef(() => ServicesUsersService))
    private readonly suService: ServicesUsersService,
    private readonly userService: UserService,
  ) {}

  //lista los modulos en roles
  async findAvailables(user: QueryToken): Promise<Module[] | any> {
    const { tokenEntityFull } = user;

    let formated = [];
    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      try {
        const modules = await this.moduleModel
          .find({
            $or: [{ creator: tokenEntityFull._id }, { creator: null }],
          })
          .populate({
            path: 'menu',
          });

        formated = modules
          .filter((mod) => mod.name !== MOD_PRINCIPAL)
          .map((x) => {
            return {
              label: x.name,
              value: x._id,
              disabled: x.status ? false : true,
            };
          });
      } catch (e) {
        throw new HttpException(
          'Error al listar los modulos disponibles.',
          HttpStatus.CONFLICT,
        );
      }
    } else {
      try {
        const modulesCreateds = await this.moduleModel
          .find({
            creator: tokenEntityFull._id,
          })
          .populate({
            path: 'menu',
          });

        const myModulesAssigneds = await this.suService.findModulesByUser(
          tokenEntityFull._id,
        );

        const modules = myModulesAssigneds.concat(modulesCreateds);

        formated = modules.map((mod) => ({
          label: mod.name,
          value: mod._id,
          disabled: mod.status ? false : true,
        }));
      } catch (e) {
        throw new HttpException(
          'Error al listar los modulos disponibles.',
          HttpStatus.CONFLICT,
        );
      }
    }

    return formated;
  }

  //lista los modulos en el crud
  async listModules(user: QueryToken): Promise<Module[]> {
    const { tokenEntityFull } = user;
    let modules = [];
    if (tokenEntityFull.role.name === ROL_PRINCIPAL) {
      modules = await this.moduleModel
        .find({
          $or: [{ creator: null }, { creator: tokenEntityFull._id }],
          //status: true,
        })
        .populate([
          {
            path: 'menu',
          },
          { path: 'creator' },
        ]);
    } else {
      const modulesByCreator = await this.moduleModel
        .find({
          creator: tokenEntityFull._id,
          //status: true,
        })
        .populate([
          {
            path: 'menu',
          },
          { path: 'creator' },
        ]);

      modules = modulesByCreator;
    }

    //Enviar los modulos sin el principal
    const sentToFront = modules.filter((mod) => mod.name !== MOD_PRINCIPAL);

    return sentToFront;
  }

  async findOne(id: string): Promise<Module> {
    const module = await this.moduleModel
      .findOne({ _id: id, status: true })
      .populate({
        path: 'menu',
      });

    if (!module) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'El modulo no existe o está inactivo.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return module;
  }

  async findAllDeleted(): Promise<Module[]> {
    return await this.moduleModel.find({ status: false }).populate({
      path: 'menu',
    });
  }

  //Find modules by names
  async findbyNames(name: any[]): Promise<ModuleDocument[]> {
    const modules = await this.moduleModel.find({
      name: { $in: name },
      status: true,
    });

    if (!modules || modules.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Hay un modulo inactivo o no existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return modules;
  }

  //Find modules by names
  async findbyName(name: string): Promise<ModuleDocument> {
    const module = await this.moduleModel.findOne({ name, status: true });

    if (!module) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          type: 'BAD_REQUEST',
          message: 'Hay un modulo inactivo o no existe.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return module;
  }

  //Add a single module
  async create(
    createModulo: CreateModuleDTO,
    user: QueryToken,
  ): Promise<Module> {
    const { name } = createModulo;
    const { tokenEntityFull } = user;

    const findModulesByCreador = await this.moduleModel.find({
      name: name,
      creator: [null, tokenEntityFull._id],
    });

    const getOneModuleByName = findModulesByCreador.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );

    console.log(findModulesByCreador);
    console.log('aqui');
    console.log(getOneModuleByName);
    //No se puede crear el elemento
    if (getOneModuleByName) {
      throw new HttpException('El modulo ya existe', HttpStatus.CONFLICT);
    }

    const modifyData = {
      ...createModulo,
      status: true,
      creator: tokenEntityFull._id,
    };

    const createdModule = new this.moduleModel(modifyData);
    return createdModule.save();
  }

  //Delete a single module
  async delete(id: string): Promise<boolean> {
    let result = false;

    //el modulo as-principal no se puede eliminar
    const findModuleForbidden = await this.moduleModel.findById(id);
    if (findModuleForbidden.name === MOD_PRINCIPAL) {
      throw new HttpException(
        'Unauthorized Exception',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      await this.moduleModel.findByIdAndUpdate(id, {
        status: false,
        deletedAt: new Date(),
      });
      result = true;
    } catch (e) {
      throw new Error(`Error en ModuleService.delete ${e}`);
    }

    return result;
  }

  //Put a single module
  async update(
    id: string,
    bodyModule: UpdateModuleDTO,
    user: QueryToken,
  ): Promise<Module> {
    const { menu, name } = bodyModule;
    const { tokenEntityFull } = user;

    const findModulesForbidden = await this.findOne(id);
    if (
      tokenEntityFull.role.name !== ROL_PRINCIPAL &&
      String(findModulesForbidden.creator).toLowerCase() !==
        String(tokenEntityFull._id).toLowerCase()
    ) {
      throw new HttpException(
        'Unauthorized Exception',
        HttpStatus.UNAUTHORIZED,
      );
    }

    //const findModuleForbidden = await this.moduleModel.findById(id);
    //el modulo as-principal no se puede actualizar ni modificar sus menus
    if (
      (findModulesForbidden.name === MOD_PRINCIPAL &&
        findModulesForbidden.name !== name) ||
      (findModulesForbidden.name === MOD_PRINCIPAL &&
        findModulesForbidden.menu.length !== menu.length)
    ) {
      throw new HttpException(
        'Unauthorized Exception',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const findModulesByCreador = await this.moduleModel.find({
      name: name,
      creator: [null, tokenEntityFull._id],
    });

    const getOneModuleByName = findModulesByCreador.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );

    const getModuleById = await this.moduleModel.findById(id);

    //el nombre ASP no se puede modificar y no se permite el ingreso de un mismo nombre ya registrado
    if (
      (getOneModuleByName && getOneModuleByName.name !== getModuleById.name) ||
      (getOneModuleByName &&
        String(name).trim() !== MOD_PRINCIPAL &&
        getModuleById.name === MOD_PRINCIPAL)
    ) {
      //No se puede crear el elemento
      throw new HttpException('El modulo ya existe', HttpStatus.CONFLICT);
    }

    const modifyData = {
      ...bodyModule,
    };

    return await this.moduleModel.findByIdAndUpdate(id, modifyData, {
      new: true,
    });
  }

  //Restore a single module
  async restore(id: string): Promise<boolean> {
    let result = false;

    try {
      await this.moduleModel.findByIdAndUpdate(id, {
        status: true,
        restoredAt: new Date(),
      });
      result = true;
    } catch (e) {
      throw new Error(`Error en ModuleService.restore ${e}`);
    }

    return result;
  }

  async findModulesIds(ids: string[]): Promise<ModuleDocument[]> {
    const modules = await this.moduleModel.find({
      _id: { $in: ids },
      status: true,
    });

    // if (validate || validate === undefined) {
    //   const modulesDesctivateds = modules.filter((mod) => mod.status === false);
    //   if (modulesDesctivateds.length > 0) {
    //     const showNames = modulesDesctivateds.map((mod) => mod.name);
    //     throw new HttpException(
    //       {
    //         status: HttpStatus.BAD_REQUEST,
    //         type: 'BAD_REQUEST',
    //         message: `Los modulos [${showNames}] no existen o esta inactivos.`,
    //       },
    //       HttpStatus.BAD_REQUEST,
    //     );
    //   }
    // }

    return modules;
  }
}
