import { EstablecimientoListDTO } from 'src/establecimiento/dto/query-establecimiento.dto';
import { TipoDocElectListDTO } from 'src/tipodocs/dto/query-tipodoc.dto';
import { UserBasicInfoDTO } from 'src/user/dto/queryUser.dto';

export class EmpresaListDTO {
  id: number;
  usuario: UserBasicInfoDTO;
  ruc: string;
  razon_social: string;
  modo: string;
  ose: string;
  web_service: string;
  sunat_usu: string;
  sunat_pass: string;
  ose_usu: string;
  ose_pass: string;
  estado: boolean;
  logo?: string;
  direccion?: string;
  ubigeo?: string;
  documentos?: TipoDocElectListDTO[];
  establecimientos?: EstablecimientoListDTO[];
}
