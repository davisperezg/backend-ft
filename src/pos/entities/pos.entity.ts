import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
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

  @ManyToOne(() => EmpresaEntity, (emp) => emp.pos, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;

  @Column({ default: true })
  estado?: boolean;

  @OneToMany(() => SeriesEntity, (serie) => serie.pos)
  series?: SeriesEntity[];

  //Referencia a users_empresa.entity
  @OneToMany(() => UsersEmpresaEntity, (usuemp) => usuemp.pos)
  users_empresa?: UsersEmpresaEntity[];

  //Referencia a invoice.entity
  @OneToMany(() => InvoiceEntity, (invoice) => invoice.pos)
  invoices?: InvoiceEntity[];
}
