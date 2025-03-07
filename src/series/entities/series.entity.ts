import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { PosEntity } from 'src/pos/entities/pos.entity';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'series' })
export class SeriesEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'char',
    length: 4,
  })
  serie: string;

  @Column({ default: true })
  estado?: boolean;

  //Referencia a tb_tipodoc_empresa
  @ManyToOne(() => TipodocsEmpresaEntity, (docemp) => docemp.series)
  @JoinColumn({ name: 'doc_empresa_id' })
  documento: TipodocsEmpresaEntity;

  //Referencia a tb_establecimientos
  @ManyToOne(() => EstablecimientoEntity, (est) => est.series)
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: EstablecimientoEntity;

  @Column({
    type: 'char',
    length: 8,
    default: '1',
  })
  numero: string;

  @ManyToOne(() => PosEntity, (pos) => pos.series, {
    nullable: false,
  })
  @JoinColumn({ name: 'pos_id' })
  pos: PosEntity;

  @ManyToOne(() => EmpresaEntity, (emp) => emp.series, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;
}
