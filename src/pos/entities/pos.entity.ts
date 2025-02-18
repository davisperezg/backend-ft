import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'puntos_de_venta' })
export class PosEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 25,
  })
  codigo: string;

  @ManyToOne(
    () => EstablecimientoEntity,
    (establecimiento) => establecimiento.pos,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: EstablecimientoEntity;
}
