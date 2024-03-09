import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { TipoEntidadEntity } from 'src/tipo-entidades/entities/tipo-entidades.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity({ name: 'entidades' })
export class EntidadEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  //tipo de entidad
  @ManyToOne(() => TipoEntidadEntity, (tipoEntidad) => tipoEntidad.entidades, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipo_entidad_id' })
  tipo_entidad?: TipoEntidadEntity;

  //empleado quien registro
  @ManyToOne(() => UserEntity, (user) => user.entidades, {
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  usuario?: UserEntity;

  //empresa perteneciente
  @ManyToOne(() => EmpresaEntity, (empresa) => empresa.entidades, {
    nullable: true,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa?: EmpresaEntity;

  @Column()
  entidad: string;

  @Column({
    nullable: true,
  })
  nombre_comercial?: string;

  @Column()
  numero_documento: string;

  @Column()
  direccion: string;

  @Column({
    nullable: true,
  })
  email_1?: string;

  @Column({
    nullable: true,
  })
  email_2?: string;

  @Column({
    nullable: true,
  })
  telefono_movil_1?: string;

  @Column({
    nullable: true,
  })
  telefono_movil_2?: string;

  @Column({
    nullable: true,
  })
  pagina_web?: string;

  @Column({
    nullable: true,
  })
  facebook?: string;

  @Column({
    nullable: true,
  })
  twitter?: string;

  @Column({
    default: true,
  })
  estado: boolean;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.cliente)
  invoices?: InvoiceEntity[];
}
