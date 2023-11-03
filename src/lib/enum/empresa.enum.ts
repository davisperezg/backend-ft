export enum EmpresaPermission {
  CreateEmpresas = 'canCreate_empresa',
  UpdateEmpresas = 'canUpdate_empresa',
  AssignEmpresas = 'canAssign_empresa',
  DesactivateEmpresas = 'canDelete_empresa',
  RestoreEmpresas = 'canRestore_empresa',
  ReadEmpresas = 'canRead_empresas', //Permite listar todas las empresas
  GetOneEmpresas = 'canGet_empresas',
}
