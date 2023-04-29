export const ROL_PRINCIPAL = 'OWNER';
export const MOD_PRINCIPAL = 'ADMINISTRACIÓN DE SISTEMA - PRINCIPAL';
export const APIS_TOKEN = 'apis-token-4405.d6HzT1gR9U21WkW0LLpN8WK1WQdfhmm2';
export const CATEGORIA_1 = 'Usuarios';
export const CATEGORIA_2 = 'Modulos';
export const CATEGORIA_3 = 'Roles';
export const CATEGORIA_4 = 'Desarrollador';

// export const resourcesByDefault = [
//   // MODULES
//   {
//     name: 'Leer Modulos', //add
//     key: 'canRead_modulesList',
//     description: 'Te permite leer todos los modulos en su tabla.',
//     status: true,
//   },
//   {
//     name: 'Leer Modulos en otras entidades', //add
//     key: 'canRead_modulesItem',
//     description: 'Te permite leer los modulos en la entidad usuario o roles.',
//     status: true,
//   },
//   {
//     name: 'Obtener informacion por modulo', //add
//     key: 'canGetModule',
//     description:
//       'Te permite obtener la data de los modulos asignados al usuario al logearte y al editar un modulo.',
//     status: true,
//   },
//   {
//     name: 'Crear Modulos', //add
//     key: 'canCreate_modules',
//     description: 'Te permite crear un modulo.',
//     status: true,
//   },
//   {
//     name: 'Editar Modulos', //add
//     key: 'canEdit_modules',
//     description: 'Te permite editar un modulo.',
//     status: true,
//   },
//   {
//     name: 'Eliminar Modulos', //add
//     key: 'canDelete_modules',
//     description:
//       'Te permite desactivar un modulo esto afecta a todos los usuarios que tienen el modulo asignado.',
//     status: true,
//   },
//   {
//     name: 'Restaurar Modulos', //add
//     key: 'canRestore_modules',
//     description: 'Te permite restaurar el modulo desactivado.',
//     status: true,
//   },
//   // ROLES
//   {
//     name: 'Crear Roles', //add
//     key: 'canCreate_roles',
//     description: 'Te permite crear un rol.',
//     status: true,
//   },
//   {
//     name: 'Editar Roles', //add
//     key: 'canEdit_roles',
//     description: 'Te permite editar un rol.',
//     status: true,
//   },
//   {
//     name: 'Eliminar Roles', //add
//     key: 'canDelete_roles',
//     description:
//       'Te permite desactivar un rol esto afectara al registrar un nuevo usuario o al editar un usuario con el mismo rol desactivado.',
//     status: true,
//   },
//   {
//     name: 'Leer Roles', //add
//     key: 'canRead_roles',
//     description: 'Te permite leer todos los roles en su tabla.',
//     status: true,
//   },
//   {
//     name: 'Obtener informacion por rol', //add
//     key: 'canGetRole',
//     description: 'Te permite obtener la data de un rol.',
//     status: true,
//   },
//   {
//     name: 'Imprimir Roles', //add
//     key: 'canPrint_roles',
//     description: 'Te permite imprimir la tabla roles.',
//     status: true,
//   },
//   {
//     name: 'Restaurar Roles', //add
//     key: 'canRestore_roles',
//     description: 'Te permite resturar un rol desactivado.',
//     status: true,
//   },
//   // USERS
//   {
//     name: 'Leer Usuarios', //add
//     key: 'canRead_users',
//     description: 'Te permite leer usuarios en su tabla.',
//     status: true,
//   },
//   {
//     name: 'Obtener informacion por usuario', //add
//     key: 'canGetUser',
//     description: 'Te permite obtener data de un usuario.',
//     status: true,
//   },
//   {
//     name: 'Crear Usuarios', //add
//     key: 'canCreate_users',
//     description: 'Te permite crear un usuario.',
//     status: true,
//   },
//   {
//     name: 'Editar Usuarios', //add
//     key: 'canEdit_users',
//     description: 'Te permite editar un usuario.',
//     status: true,
//   },
//   {
//     name: 'Eliminar Usuarios', //add
//     key: 'canDelete_users',
//     description: 'Te permite desactivar un usuario esto afectara al loguearse.',
//     status: true,
//   },
//   {
//     name: 'Cambiar contraseña de usuarios', //add
//     key: 'canChangePassword_users',
//     description: 'Te permite cambiar la password del usuario.',
//     status: true,
//   },
//   {
//     name: 'Restaurar Usuarios', //add
//     key: 'canRestore_users',
//     description: 'Te permite restaurar un usuario desactivado.',
//     status: true,
//   },
//   // RESOURCES
//   {
//     name: 'Crear Permiso(DESARROLLADOR)', //add
//     key: 'canCreate_Resource',
//     description:
//       'Te permite crear un permiso(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Leer Permisos(DESARROLLADOR)', //add
//     key: 'canRead_ResourcesList',
//     description:
//       'Te permite leer todos los permisos de su tabla(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Leer Permisos en otras entidades', //add
//     key: 'canRead_ResourcesItem',
//     description: 'Te permite leer los permisos en las entidades usuario o rol',
//     status: true,
//   },
//   {
//     name: 'Editar Permisos(DESARROLLADOR)', //add
//     key: 'canEdit_Resource',
//     description:
//       'Te permite editar un permiso(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Obtener informacion por permiso(DESARROLLADOR)', //add
//     key: 'canGetResource',
//     description:
//       'Te permite obtener la data por permiso(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   // RR
//   {
//     name: 'Leer los recursos por rol en la entidad rol', //add
//     key: 'canRead_ResourcebyRol',
//     description:
//       'Te permite leer los recursos o permisos en la entidad solo rol.',
//     status: true,
//   },
//   {
//     name: 'Crear y/o actualizar recursos por roles', //add
//     key: 'canCreate_ResourceR',
//     description:
//       'Te permite crear y/o actualizar los recrusos o permisos en la entidad solo rol.',
//     status: true,
//   },
//   // MENU
//   {
//     name: 'Leer Menus', //add
//     key: 'canRead_menus',
//     description: 'Te permite leer menus en la entidad modulos.',
//     status: true,
//   },
//   {
//     name: 'Crear Menu(DESARROLLADOR)', //add
//     key: 'canCreate_menus',
//     description:
//       'Te permite crear un menu(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Editar Menu(DESARROLLADOR)', //add
//     key: 'canEdit_menus',
//     description:
//       'Te permite crear un menu(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Eliminar Menu(DESARROLLADOR)', //add
//     key: 'canDelete_menus',
//     description:
//       'Te permite crear un menu(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   {
//     name: 'Restaurar Menu(DESARROLLADOR)', //add
//     key: 'canRestore_menus',
//     description:
//       'Te permite crear un menu(Se recomienda solo para desarrolladores).',
//     status: true,
//   },
//   // RU
//   {
//     name: 'Leer los recursos por usuario en otras entidades', //add
//     key: 'canRead_ResourcebyUser',
//     description:
//       'Te permite leer los recursos o permisos por usuario solo en la entidad usuario.',
//     status: true,
//   },
//   {
//     name: 'Crear y/o actualizar recursos por usuario', //add
//     key: 'canCreate_ResourceU',
//     description:
//       'Te permite crear y/o actualizar los permisos o recusos por usuario solo en la entidad usuario.',
//     status: true,
//   },
//   // SU
//   {
//     name: 'Leer los modulos o servicios por usuario en otras entidades', //add
//     key: 'canRead_ServicebyUser',
//     description:
//       'Te permite leer los modulos o servicios por usuario esto afecta al usuario al loguearse y en la entidad usuario',
//     status: true,
//   },
//   {
//     name: 'Crear y/o actualizar modulos o servicios por usuario', //add
//     key: 'canCreate_ServiceU',
//     description:
//       'Te permite crear y/o actualizar los modulos o servicios por usuario solo en la entidad usuario.',
//     status: true,
//   },
// ];

export const RECURSOS_DEFECTOS = [
  // USERS
  {
    name: 'Crear Usuarios', //add
    key: 'canCreate_users',
    description: 'Te permite crear usuarios.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Listar rol para asignar usuario', //add
    key: 'canReadRoles_users',
    description:
      'Permite al usuario ver la lista de roles disponibles para asignar a un nuevo usuario.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Leer Usuarios', //add
    key: 'canRead_users',
    description: 'Te permite leer usuarios.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Editar Usuarios', //add
    key: 'canUpdate_users',
    description: 'Te permite editar un usuario.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Desactivar Usuarios', //add
    key: 'canDelete_users',
    description: 'Te permite desactivar un usuario esto afectara al loguearse.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Vizualizar data de usuarios', //add
    key: 'canGet_users',
    description:
      'Te permite ver el description o data de un usuario en especifico.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Cambiar contraseña de usuarios', //add
    key: 'canChangePassword_users',
    description: 'Te permite cambiar la password del usuario.',
    group_resource: CATEGORIA_1,
  },
  {
    name: 'Restaurar Usuarios', //add
    key: 'canRestore_users',
    description: 'Te permite restaurar un usuario.',
    group_resource: CATEGORIA_1,
  }, //FIN DE USUARIOS
  // MODULES
  {
    name: 'Crear Modulos', //add
    key: 'canCreate_modules',
    description: 'Te permite crear modulos.',
    group_resource: CATEGORIA_2,
  },
  {
    name: 'Leer Modulos', //add
    key: 'canRead_modules',
    description: 'Te permite leer los modulos.',
    group_resource: CATEGORIA_2,
  },
  {
    name: 'Editar Modulos', //add
    key: 'canUpdate_modules',
    description: 'Te permite editar modulos.',
    group_resource: CATEGORIA_2,
  },
  {
    name: 'Desactivar Modulos', //add
    key: 'canDelete_modules',
    description: 'Te permite desactivar modulos.',
    group_resource: CATEGORIA_2,
  },
  {
    name: 'Vizualizar data de modulos', //add
    key: 'canGet_modules',
    description:
      'Te permite ver el description o data de un modulo en especifico.',
    group_resource: CATEGORIA_2,
  },
  {
    name: 'Restaurar Modulos', //add
    key: 'canRestore_modules',
    description: 'Te permite restaurar modulos.',
    group_resource: CATEGORIA_2,
  }, //FIN DE MODULOS
  // {
  //   name: 'Leer Modulos en otras entidades', //add
  //   key: 'canRead_modulesItem',
  //   description: 'Te permite leer los modulos en la entidad usuario o roles.',
  //   group_resource: CATEGORIA_2,
  // },

  // ROLES
  {
    name: 'Crear Roles', //add
    key: 'canCreate_roles',
    description: 'Te permite crear roles.',
    group_resource: CATEGORIA_3,
  },
  {
    name: 'Leer Roles', //add
    key: 'canRead_roles',
    description: 'Te permite leer roles.',
    group_resource: CATEGORIA_3,
  },
  {
    name: 'Editar Roles', //add
    key: 'canUpdate_roles',
    description: 'Te permite editar roles.',
    group_resource: CATEGORIA_3,
  },
  {
    name: 'Desactivar Roles', //add
    key: 'canDelete_roles',
    description: 'Te permite desactivar un roles.',
    group_resource: CATEGORIA_3,
  },
  {
    name: 'Vizualizar data de roles', //add
    key: 'canGet_roles',
    description:
      'Te permite ver el description o data de un rol en especifico.',
    group_resource: CATEGORIA_3,
  },
  {
    name: 'Restaurar Roles', //add
    key: 'canRestore_roles',
    description: 'Te permite resturar roles.',
    group_resource: CATEGORIA_3,
  },
  // PERMISOS
  {
    name: 'Crear Permisos', //add
    key: 'canCreate_permisos',
    description: 'Te permite crear permisos.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Leer Permisos', //add
    key: 'canRead_permisos',
    description: 'Te permite leer permisos.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Editar Permisos', //add
    key: 'canUpdate_permisos',
    description: 'Te permite editar permisos.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Vizualizar data de permisos', //add
    key: 'canGet_permisos',
    description:
      'Te permite ver el description o data de un permiso en especifico.',
    group_resource: CATEGORIA_4,
  }, //FIN PERMISOS
  // {
  //   name: 'Leer Permisos en otras entidades', //add
  //   key: 'canRead_ResourcesItem',
  //   description: 'Te permite leer los permisos en las entidades usuario o rol',
  //   group_resource: CATEGORIA_4,
  // },
  // RR
  // {
  //   name: 'Leer los recursos por rol en la entidad rol', //add
  //   key: 'canRead_ResourcebyRol',
  //   description: 'Te permite leer los recursos o permisos en la entidad solo rol.',
  //   group_resource: CATEGORIA_4,
  // },
  // {
  //   name: 'Crear y/o actualizar recursos por roles', //add
  //   key: 'canCreate_ResourceR',
  //   description:
  //     'Te permite crear y/o actualizar los recrusos o permisos en la entidad solo rol.',
  //   group_resource: CATEGORIA_4,
  // },
  // MENU
  {
    name: 'Crear Menu', //add
    key: 'canCreate_menus',
    description: 'Te permite crear menus.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Leer Menus', //add
    key: 'canRead_menus',
    description: 'Te permite leer menus.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Editar Menus', //add
    key: 'canUpdate_menus',
    description: 'Te permite editar menus.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Desactivar Menus', //add
    key: 'canDelete_menus',
    description: 'Te permite desactivar menus.',
    group_resource: CATEGORIA_4,
  },
  {
    name: 'Restaurar Menu', //add
    key: 'canRestore_menus',
    description: 'Te permite restaurar menus.',
    group_resource: CATEGORIA_4,
  },
  // RU
  // {
  //   name: 'Leer los recursos por usuario en otras entidades', //add
  //   key: 'canRead_ResourcebyUser',
  //   description:
  //     'Te permite leer los recursos o permisos por usuario solo en la entidad usuario.',
  //   group_resource: CATEGORIA_4,
  // },
  // {
  //   name: 'Crear y/o actualizar recursos por usuario', //add
  //   key: 'canCreate_ResourceU',
  //   description:
  //     'Te permite crear y/o actualizar los permisos o recusos por usuario solo en la entidad usuario.',
  //   group_resource: CATEGORIA_4,
  // },
  // SU
  // {
  //   name: 'Leer los modulos o servicios por usuario en otras entidades', //add
  //   key: 'canRead_ServicebyUser',
  //   description:
  //     'Te permite leer los modulos o servicios por usuario esto afecta al usuario al loguearse y en la entidad usuario',
  //   group_resource: CATEGORIA_4,
  // },
  // {
  //   name: 'Crear y/o actualizar modulos o servicios por usuario', //add
  //   key: 'canCreate_ServiceU',
  //   description:
  //     'Te permite crear y/o actualizar los modulos o servicios por usuario solo en la entidad usuario.',
  //   group_resource: CATEGORIA_4,
  // },
];
