import { RolePermission } from '../enum/role.enum';
import { UserPermission } from '../enum/user.enum';

const Permission = {
  ...UserPermission,
  ...RolePermission,
};

type Permission = UserPermission | RolePermission;

export default Permission;
