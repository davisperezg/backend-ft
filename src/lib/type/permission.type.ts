import { ModulePermission } from '../enum/module.enum';
import { RolePermission } from '../enum/role.enum';
import { UserPermission } from '../enum/user.enum';
import { ResourcePermission } from '../enum/resource.enum';
import { MenuPermission } from '../enum/menu.enum';
import { GroupPermission } from '../enum/group-resource.enum';
import { InvoicesPermission } from '../enum/Invoices.enum';
import { EmpresaPermission } from '../enum/empresa.enum';
import { EstablecimientoPermission } from '../enum/establecimiento.enum';
import { TipoDocsPermission } from '../enum/tipodocs.enum';
import { SeriesPermission } from '../enum/serie.enum';
import { ClientePermission } from '../enum/cliente.enum';
import { NotaVentaPermission } from '../enum/nota-venta.enum';

const Permission = {
  ...UserPermission,
  ...RolePermission,
  ...ModulePermission,
  ...ResourcePermission,
  ...MenuPermission,
  ...GroupPermission,
  ...InvoicesPermission,
  ...EmpresaPermission,
  ...EstablecimientoPermission,
  ...TipoDocsPermission,
  ...SeriesPermission,
  ...ClientePermission,
  ...NotaVentaPermission,
};

type Permission =
  | UserPermission
  | RolePermission
  | ModulePermission
  | ResourcePermission
  | MenuPermission
  | GroupPermission
  | InvoicesPermission
  | EmpresaPermission
  | EstablecimientoPermission
  | TipoDocsPermission
  | SeriesPermission
  | ClientePermission
  | NotaVentaPermission;

export default Permission;
