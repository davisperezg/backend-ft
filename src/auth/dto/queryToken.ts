import Permission from 'src/lib/type/permission.type';
import { RoleDocument } from 'src/role/schemas/role.schema';
import { UserDocument } from 'src/user/schemas/user.schema';

class QueryTokenUser {
  id: string;
  usuario: string;
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
}

export class QueryToken {
  token_of_front: QueryTokenUser;
  token_of_permisos: Permission[];
  tokenEntityFull: Partial<Omit<UserDocument, 'role'>> & { role: RoleDocument };
}
