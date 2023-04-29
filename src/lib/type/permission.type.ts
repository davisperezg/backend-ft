import { ModulePermission } from '../enum/module.enum';
import { RolePermission } from '../enum/role.enum';
import { UserPermission } from '../enum/user.enum';
import { ResourcePermission } from '../enum/resource.enum';
import { MenuPermission } from '../enum/menu.enum';
import { GroupPermission } from '../enum/group-resource.enum';

const Permission = {
  ...UserPermission,
  ...RolePermission,
  ...ModulePermission,
  ...ResourcePermission,
  ...MenuPermission,
  ...GroupPermission,
};

type Permission =
  | UserPermission
  | RolePermission
  | ModulePermission
  | ResourcePermission
  | MenuPermission
  | GroupPermission;

export default Permission;
