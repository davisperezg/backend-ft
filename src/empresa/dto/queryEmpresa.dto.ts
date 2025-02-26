import { UserBasicInfoDTO } from 'src/user/dto/queryUser.dto';
import { EmpresaListDTO } from './queryEmpresas.dto';
import { OmitType } from '@nestjs/swagger';
import { POSListDTO } from 'src/pos/dto/query-pos.dto';

export class EmpresaDetailDTO extends OmitType(EmpresaListDTO, [
  'logo',
  'modo',
  'ose',
  'sunat_usu',
  'sunat_pass',
  'ose_usu',
  'ose_pass',
  'usuario',
  'direccion',
] as const) {
  usuario: Omit<UserBasicInfoDTO, 'id_usuario'> & {
    id: number;
  };
  logo: {
    name: string;
    src: string;
  }[];
  cert: {
    name: string;
  }[];
  nombre_comercial: string;
  domicilio_fiscal: string;
  urbanizacion: string;
  correo: string;
  telefono_movil_1: string;
  telefono_movil_2: string;
  telefono_fijo_1: string;
  telefono_fijo_2: string;
  fieldname_cert: string;
  cert_password: string;
  modo: number;
  ose_enabled: boolean;
  usu_secundario_user: string;
  usu_secundario_password: string;
  usu_secundario_ose_user: string;
  usu_secundario_ose_password: string;
  pos: POSListDTO[];
}
