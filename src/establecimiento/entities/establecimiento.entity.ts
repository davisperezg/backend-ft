import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'establecimientos' })
export class EstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true })
  codigo?: string;

  @Column()
  denominacion: string;

  @Column({ nullable: true })
  departamento?: string;

  @Column({ nullable: true })
  provincia?: string;

  @Column({ nullable: true })
  distrito?: string;

  @Column({ nullable: true })
  direccion?: string;

  @Column({ nullable: true })
  ubigeo?: string;

  @Column({ nullable: true })
  logo?: string;

  @ManyToOne(() => EmpresaEntity, (emp) => emp.establecimientos)
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;

  @Column({ default: true })
  estado?: boolean;
}
