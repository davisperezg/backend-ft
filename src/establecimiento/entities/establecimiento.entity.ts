import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'establecimientos' })
export class EstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  nombre_establecimiento: string;

  @Column()
  codigo_establecimiento_sunat: string;

  @Column()
  nombre_comercial_establecimiento: string;

  @Column({ nullable: true })
  direccion?: string;

  @Column({ nullable: true })
  logo?: string;
}
