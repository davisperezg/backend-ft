import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import {
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

  @Column()
  serie: string;

  @Column({ default: true })
  estado?: boolean;

  //Referencia a tb_tipodoc_empresa
  @ManyToOne(() => TipodocsEmpresaEntity, (docemp) => docemp.series)
  @JoinColumn({ name: 'doc_empresa_id' })
  documento?: TipodocsEmpresaEntity;
}
