import { ConfigEstablecimientoEntity } from 'src/configuraciones/entities/configuraciones_establecimiento.entity';
import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { SeriesEntity } from 'src/series/entities/series.entity';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
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

  //Referencia a tb_series
  @OneToMany(() => SeriesEntity, (serie) => serie.establecimiento)
  series?: SeriesEntity[];

  //Referencia a users_empresa.entity
  @OneToMany(() => UsersEmpresaEntity, (usuemp) => usuemp.establecimiento)
  users_empresa?: UsersEmpresaEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.establecimiento)
  invoices?: InvoiceEntity[];

  //Referencia a establecimiento.entity
  @OneToMany(
    () => ConfigEstablecimientoEntity,
    (config) => config.establecimiento,
  )
  configsEstablecimiento?: ConfigEstablecimientoEntity[];
}
