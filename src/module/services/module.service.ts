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

    //No se puede crear el elemento
    if (getOneModuleByName) {
      throw new HttpException('El modulo ya existe.', HttpStatus.CONFLICT);
    }

    const modifyData = {
      ...createModulo,
      status: true,
      creator: tokenEntityFull._id,
    };

    const createdModule = new this.moduleModel(modifyData);

    try {
      return await createdModule.save();
    } catch (e) {
      throw new HttpException(
        'Error intentar crear modulo.',
        HttpStatus.BAD_REQUEST,
      );
    }
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
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
    }

    //const findModuleForbidden = await this.moduleModel.findById(id);
    //el modulo as-principal no se puede actualizar ni modificar sus menus
    if (
      (findModulesForbidden.name === MOD_PRINCIPAL &&
        findModulesForbidden.name !== name) ||
      (findModulesForbidden.name === MOD_PRINCIPAL &&
        findModulesForbidden.menu.length !== menu.length)
    ) {
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
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
      throw new HttpException('El modulo ya existe.', HttpStatus.CONFLICT);
    }

    const modifyData = {
      ...bodyModule,
    };

    try {
      return await this.moduleModel.findByIdAndUpdate(id, modifyData, {
        new: true,
      });
    } catch (e) {
      throw new HttpException(
        'Error intentar actualizar modulo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Delete a single module
  async delete(id: string, user: QueryToken): Promise<boolean> {
    let result = false;
    const { tokenEntityFull } = user;

    //el modulo as-principal no se puede eliminar
    const findModuleForbidden = await this.moduleModel.findById(id);

    if (findModuleForbidden.status === false)
      throw new HttpException(
        'El modulo ya ha sido desactivado.',
        HttpStatus.BAD_REQUEST,
      );

    if (findModuleForbidden.name === MOD_PRINCIPAL) {
      throw new HttpException('Permiso denegado.', HttpStatus.CONFLICT);
    }

    try {
      await this.moduleModel.findByIdAndUpdate(id, {
        status: false,
        deletedAt: new Date(),
        deletedBy: tokenEntityFull._id,
      });
      result = true;
    } catch (e) {
      throw new HttpException(
        'Error al desactivar modulo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  //Restore a single module
  async restore(id: string, user: QueryToken): Promise<boolean> {
    let result = false;
    const { tokenEntityFull } = user;
    const findModule = await this.findOne(id);

    if (findModule.status === true)
      throw new HttpException(
        'El modulo ya está activo.',
        HttpStatus.BAD_REQUEST,
      );

    if (findModule.name === MOD_PRINCIPAL)
      throw new HttpException('Permiso denegado.', HttpStatus.BAD_REQUEST);

    try {
      await this.moduleModel.findByIdAndUpdate(id, {
        status: true,
        restoredAt: new Date(),
        restoredBy: tokenEntityFull._id,
      });
      result = true;
    } catch (e) {
      throw new HttpException(
        'Error al restaurar modulo.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  async findOne(id: string): Promise<Module> {
    try {
      const module = await this.moduleModel
        .findOne({ _id: id, status: true })
        .populate({
          path: 'menu',
        });

      if (!module) {
        throw new HttpException(
          'El modulo no existe o está inactivo.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return module;
    } catch (e) {
      throw new HttpException(
        'Ocurrio un error al intentar buscar modulo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findModulesIds(ids: string[]): Promise<ModuleDocument[]> {
    let modules = [];

    try {
      modules = await this.moduleModel.find({
        _id: { $in: ids },
        status: true,
      });
    } catch (e) {
      throw new HttpException(
        'Ocurrio un error al intentar buscar modulos por ids.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return modules;
  }
}
