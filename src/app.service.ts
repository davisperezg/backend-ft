import {
  Resource_User,
  Resource_UserDocument,
} from './resources-users/schemas/resources-user';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Groupsresources,
  GroupsresourcesDocument,
} from './groups-resources/schemas/groups-resources.schema';
import {
  CATEGORIA_1,
  CATEGORIA_2,
  CATEGORIA_3,
  CATEGORIA_4,
  CATEGORIA_5,
  CATEGORIA_6,
  CATEGORIA_7,
  CATEGORIA_8,
  CATEGORIA_9,
  MOD_PRINCIPAL,
  RECURSOS_DEFECTOS,
  ROL_PRINCIPAL,
} from './lib/const/consts';
import { Resource, ResourceDocument } from './resource/schemas/resource.schema';
import { Role, RoleDocument } from './role/schemas/role.schema';
import { User, UserDocument } from './user/schemas/user.schema';
import { Menu, MenuDocument } from './menu/schemas/menu.schema';
import { Module, ModuleDocument } from './module/schemas/module.schema';
import { hashPassword } from './lib/helpers/auth.helper';
import {
  Services_User,
  Services_UserDocument,
} from './services-users/schemas/services-user';
import {
  Resource_Role,
  Resource_RoleDocument,
} from './resources-roles/schemas/resources-role';
import { TipodocsEntity } from './tipodocs/entities/tipodocs.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Groupsresources.name)
    private groupModel: Model<GroupsresourcesDocument>,
    @InjectModel(Resource.name)
    private resourceModel: Model<ResourceDocument>,
    @InjectModel(Resource_User.name)
    private ruModel: Model<Resource_UserDocument>,
    @InjectModel(Resource_Role.name)
    private rrModel: Model<Resource_RoleDocument>,
    @InjectModel(Role.name)
    private rolModel: Model<RoleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Menu.name)
    private menuModel: Model<MenuDocument>,
    @InjectModel(Module.name)
    private moduleModel: Model<ModuleDocument>,
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
    @InjectRepository(TipodocsEntity)
    private tipodocsRepository: Repository<TipodocsEntity>,
  ) {}

  async onApplicationBootstrap() {
    await this.init();
  }

  private async init() {
    //Evitamos doble registro
    const count = await this.userModel.estimatedDocumentCount();
    if (count > 0) return;

    //Crea las categorias por defecto
    await Promise.all([
      new this.groupModel({
        name: CATEGORIA_1,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_2,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_3,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_4,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_5,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_6,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_7,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_8,
      }).save(),
      new this.groupModel({
        name: CATEGORIA_9,
      }).save(),
    ]);

    //Busca todas las categorias ingresadas
    const categorys = await this.groupModel.find();

    //Recorremos los recursos defatuls con las categorias insertadas para obtener las id
    const mapped = RECURSOS_DEFECTOS.map((obj) => {
      const item = categorys.find((cat) => cat.name === obj.group_resource);
      return item ? { ...obj, group_resource: item._id } : obj;
    });

    //Guardamos los recursos
    await this.resourceModel.insertMany(mapped);

    //Agregamos menus
    const menusToADM = await Promise.all([
      new this.menuModel({
        name: 'Usuarios',
        status: true,
        link: 'usuarios',
      }).save(),
      new this.menuModel({
        name: 'Roles',
        status: true,
        link: 'roles',
      }).save(),
      new this.menuModel({
        name: 'Modulos',
        status: true,
        link: 'modulos',
      }).save(),
      new this.menuModel({
        name: 'Permisos',
        status: true,
        link: 'permisos',
      }).save(),
    ]);

    //Agregando menus ventas
    const menusToVentas = await Promise.all([
      new this.menuModel({
        name: 'Factura',
        status: true,
        link: 'factura',
      }).save(),
      new this.menuModel({
        name: 'Boleta',
        status: true,
        link: 'boleta',
      }).save(),
      new this.menuModel({
        name: 'Nota de Credito',
        status: true,
        link: 'nota-credito',
      }).save(),
      new this.menuModel({
        name: 'Nota de Debito',
        status: true,
        link: 'nota-debito',
      }).save(),
      new this.menuModel({
        name: 'Guia Remitente',
        status: true,
        link: 'guia-remitente',
      }).save(),
      new this.menuModel({
        name: 'Guia Transportista',
        status: true,
        link: 'guia-transportista',
      }).save(),
      new this.menuModel({
        name: 'Cotizaciones',
        status: true,
        link: 'cotizaciones',
      }).save(),
      new this.menuModel({
        name: 'Pedidos',
        status: true,
        link: 'pedidos',
      }).save(),
    ]);

    //Agregando almacen
    const menusToAlmacen = await Promise.all([
      new this.menuModel({
        name: 'Unidades',
        status: true,
        link: 'unidades',
      }).save(),
      new this.menuModel({
        name: 'Categorias',
        status: true,
        link: 'categorias',
      }).save(),
      new this.menuModel({
        name: 'Productos',
        status: true,
        link: 'productos',
      }).save(),
      new this.menuModel({
        name: 'Movimiento Almacen',
        status: true,
        link: 'movimiento-almacen',
      }).save(),
      new this.menuModel({
        name: 'Pedido Almacen',
        status: true,
        link: 'pedido-almacen',
      }).save(),
    ]);

    //Agregando mnus a entidades
    const menusToEntidades = await Promise.all([
      new this.menuModel({
        name: 'Clientes',
        status: true,
        link: 'clientes',
      }).save(),
      new this.menuModel({
        name: 'Proveedores',
        status: true,
        link: 'proveedores',
      }).save(),
    ]);

    //Agregando mnus a altas
    const altasToEntidades = await Promise.all([
      new this.menuModel({
        name: 'Empresas',
        status: true,
        link: 'empresas',
      }).save(),
      new this.menuModel({
        name: 'Documentos',
        status: true,
        link: 'documentos',
      }).save(),
      new this.menuModel({
        name: 'Tipo de documentos',
        status: true,
        link: 'tipo-de-documentos',
      }).save(),
      new this.menuModel({
        name: 'Series',
        status: true,
        link: 'series',
      }).save(),
    ]);

    //Agregamos modulos
    const modulesToADM = await Promise.all([
      new this.moduleModel({
        name: MOD_PRINCIPAL,
        status: true,
        menu: menusToADM,
        creator: null,
      }).save(),
      new this.moduleModel({
        name: 'Altas',
        status: true,
        menu: altasToEntidades,
        creator: null,
      }).save(),
      new this.moduleModel({
        name: 'Entidades',
        status: true,
        menu: menusToEntidades,
        creator: null,
      }).save(),
      new this.moduleModel({
        name: 'Ventas',
        status: true,
        menu: menusToVentas,
        creator: null,
      }).save(),
      new this.moduleModel({
        name: 'Almacen',
        status: true,
        menu: menusToAlmacen,
        creator: null,
      }).save(),
    ]);

    //Agregamos rol
    const rol = new this.rolModel({
      name: ROL_PRINCIPAL,
      status: true,
      module: modulesToADM,
      creator: null,
    }).save();

    //Agregamos usuario
    const passwordHashed = await hashPassword('admin123');
    const user = new this.userModel({
      name: 'DAVIS KEINER',
      lastname: 'PEREZ GUZMAN',
      tipDocument: 'DNI',
      nroDocument: '99999999',
      email: 'admin@admin.com.pe',
      username: 'admin',
      password: passwordHashed,
      status: true,
      role: await rol,
      creator: null,
    }).save();

    //Obtenemos id de recursos x defectos
    const keys = RECURSOS_DEFECTOS.map((res) => res.key);
    const findResources = await this.resourceModel.find({
      key: { $in: keys },
      status: true,
    });

    const getIdsResources = findResources.map((res) => res._id);

    //Agregamos recursos al usuario
    new this.ruModel({
      user: await user,
      resource: getIdsResources,
      status: true,
    }).save();

    //Agregamos recursos al rol
    new this.rrModel({
      role: await rol,
      resource: getIdsResources,
      status: true,
    }).save();

    //Agregamos los servicios al usuario
    new this.suModel({
      status: true,
      module: modulesToADM,
      user: await user,
    }).save();

    //Tipo de documentos por defecto
    const tiposDocumento = [
      { codigo: '01', tipo_documento: 'Factura', abreviado: 'F' },
      { codigo: '03', tipo_documento: 'Boleta', abreviado: 'B' },
    ];

    //Creamos los tipos de documentos
    const createTipoDocumento = tiposDocumento.map((doc) => {
      return this.tipodocsRepository.create({
        codigo: doc.codigo,
        tipo_documento: doc.tipo_documento,
        abreviado: doc.abreviado,
      });
    });

    //Guardamos los objetos creados
    createTipoDocumento.map(async (obj) => {
      await this.tipodocsRepository.save(obj);
    });
  }

  getHello(): string {
    return 'API funcionando correctamente!!';
  }
}
