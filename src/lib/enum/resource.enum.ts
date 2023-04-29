export enum ResourcePermission {
  CreatePermisos = 'canCreate_permisos', //muestra los recursos en items
  ReadPermisos = 'canRead_permisos', //muestra los recursos en su crud
  UpdatePermisos = 'canUpdate_permisos',
  GetOnePermisos = 'canGet_permisos',
  //GetOneResource = 'canGetResource', //muestra valores de un solo recurso
  //RR
  // ReadResourceR = 'canRead_ResourceR', //inactivo
  // CreateResourceR = 'canCreate_ResourceR', //crea un recurso por rol
  // EditResourceR = 'canEdit_ResourceR', //inactivo
  // ReadResourcesByRol = 'canRead_ResourcebyRol', //muestra recursos por rol
  // //RU
  // CreateResourceU = 'canCreate_ResourceU', //crea un recurso por user
  // ReadResourcesByUser = 'canRead_ResourcebyUser', //muestra recursos por user
  // // SU
  // CreateServiceUser = 'canCreate_ServiceU', //crea un modulo o servicio por user
  // ReadServicesBUser = 'canRead_ServicebyUser', //muestra modulo o servicio por user
}
