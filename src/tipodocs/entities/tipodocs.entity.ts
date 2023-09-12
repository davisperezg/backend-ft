import { SeriesEntity } from 'src/series/entities/series.entity';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tipo_documentos' })
export class TipodocsEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  codigo: string;

  @Column()
  tipo_documento: string;

  @Column()
  abreviado: string;

  @Column({ default: true })
  estado?: boolean;

  @OneToMany(() => SeriesEntity, (serie) => serie.documento)
  series?: SeriesEntity[];

  @OneToMany(() => TipodocsEmpresaEntity, (tipemp) => tipemp.tipodoc)
  tipodoc_empresa?: TipodocsEmpresaEntity[];
}
