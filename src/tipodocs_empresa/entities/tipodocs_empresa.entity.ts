import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'tipodoc_empresa' })
export class TipodocsEmpresaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ default: true })
  estado?: boolean;

  @ManyToOne(() => TipodocsEntity, (tip) => tip.tipodoc_empresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipodoc_id' })
  tipodoc: TipodocsEntity;

  @ManyToOne(() => EmpresaEntity, (emp) => emp.tipodoc_empresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;
}
