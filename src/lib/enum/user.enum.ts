export enum UserPermission {
  CreateUsers = 'canCreate_users',
  ReadRolesAvailables = 'canReadRoles_users', //Permite al usuario ver la lista de roles disponibles para asignar a un nuevo usuario.
  ReadUsers = 'canRead_users',
  UpdateUsers = 'canUpdate_users',
  DeleteUsers = 'canDelete_users',
  GetOneUsers = 'canGet_users',
  ChangePasswordUsers = 'canChangePassword_users',
  RestoreUsers = 'canRestore_users',
}
