import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'departamentos' })
export class DepartamentoEntity {
  @PrimaryColumn({ type: 'char', length: 2 })
  id: string;

  @Column()
  departamento: string;
}
