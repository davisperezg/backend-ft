export enum UserPermission {
  CreateUsers = 'canCreate_users',
  ReadRolesAvailables = 'canReadRoles_users', //Permite al usuario ver la lista de roles disponibles para asignar a un nuevo usuario.
  ReadModulosAvailables = 'canReadModulos_users', //Permite al usuario ver la lista de modulos disponibles para asignar a un nuevo usuario.
  ReadModulos2Availables = 'canReadModulos_roles', //Permite al rol ver la lista de modulos disponibles para asignar a un nuevo rol.
  ReadPermisosAvailables = 'canReadPermisos_users', //Permite al usuario ver la lista de permisos disponibles para asignar a un nuevo usuario.
  ReadPermisos2Availables = 'canReadPermisos_roles', //Permite al usuario ver la lista de permisos disponibles para asignar a un nuevo rol.
  ReadUsers = 'canRead_users',
  UpdateUsers = 'canUpdate_users',
  DeleteUsers = 'canDelete_users',
  GetOneUsers = 'canGet_users',
  ChangePasswordUsers = 'canChangePassword_users',
  RestoreUsers = 'canRestore_users',
}
