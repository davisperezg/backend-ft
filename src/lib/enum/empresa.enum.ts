export enum EmpresaPermission {
  CreateEmpresas = 'canCreate_empresas',
  UpdateEmpresas = 'canUpdate_empresas',
  DesactivateEmpresas = 'canDelete_empresas',
  RestoreEmpresas = 'canRestore_empresas',
  ReadEmpresas = 'canRead_empresas', //Permite listar todas las empresas
  GetOneEmpresas = 'canGet_empresas',
  ListEmpresasToAsign = 'canList_empresasToAsign',
}
