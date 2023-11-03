import { UserBasicInfoDTO } from 'src/user/dto/queryUser.dto';

export class EmpresaSimpleDTO {
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
  status: boolean;
  logo?: string;
  direccion?: string;
  ubigeo?: string;
  documentos?: any[];
  establecimientos?: any[];
}
