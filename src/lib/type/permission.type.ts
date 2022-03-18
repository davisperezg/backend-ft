import { ModulePermission } from '../enum/module.enum';
import { RolePermission } from '../enum/role.enum';
import { UserPermission } from '../enum/user.enum';
import { ResourcePermission } from '../enum/resource.enum';
import { MenuPermission } from '../enum/menu.enum';

const Permission = {
  ...UserPermission,
  ...RolePermission,
  ...ModulePermission,
  ...ResourcePermission,
  ...MenuPermission,
};

type Permission =
  | UserPermission
  | RolePermission
  | ModulePermission
  | ResourcePermission
  | MenuPermission;

export default Permission;
