export enum EstablecimientoPermission {
  CreateEstablecimientos = 'canCreate_establecimientos',
  DesactivateEstablecimientos = 'canDelete_establecimientos',
  RestoreEstablecimientos = 'canRestore_establecimientos',
  ReadEstablecimientos = 'canRead_establecimientos', //Permite listar todas los establecimientos disponibles para el cliente
  AssignEstablecimientos = 'canAssign_establecimientos', //Permite agregar usuarios a mi establecimiento
}
