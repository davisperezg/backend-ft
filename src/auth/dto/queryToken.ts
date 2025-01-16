import Permission from 'src/lib/type/permission.type';
import { RoleDocument } from 'src/role/schemas/role.schema';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { UserDocument } from 'src/user/schemas/user.schema';

class QueryTokenUser {
  id: string;
  nombre_usuario: string;
  usuario: string;
  email_usuario: string;
  estado_usuario: boolean;
  rol: {
    nombre: string;
    modulos: {
      nombre: string;
      estado: boolean;
      menus: {
        nombre: string;
        estado: boolean;
      }[];
    }[];
  };
  estado_rol: boolean;
  empresas?: {
    id: number;
    ruc: string;
    razon_social: string;
    domicilio_fiscal: string;
    modo: string;
    nombre_comercial: string;
    logo: string;
    estado: string;
    configuraciones: any[];
    establecimientos: any[];
  }[];
  empresaActual?: {
    id: number;
    ruc: string;
    razon_social: string;
    domicilio_fiscal: string;
    modo: string;
    nombre_comercial: string;
    logo: string;
    estado: string;
    configuraciones: any[];
    establecimiento: any[];
  };
}

export class QueryToken {
  token_of_front: QueryTokenUser;
  token_of_permisos: Permission[];
  tokenEntityFull: Partial<Omit<UserDocument, 'role'>> & {
    role: RoleDocument;
  } & { empresas?: EmpresaEntity[] };
}
