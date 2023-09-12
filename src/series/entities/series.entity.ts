import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
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

  // @ManyToOne(() => TipodocsEntity, (doc) => doc.series)
  // @JoinColumn({ name: 'tip_documento_id' })
  // documento?: TipodocsEntity;
}
