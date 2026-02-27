import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
} from 'typeorm';
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { ConnectionWS } from 'src/connection/entities/connection_ws.entity';
import { NotaVentaEntity } from 'src/nota-venta/entities/nota-venta.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  _id?: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @OneToMany(() => EmpresaEntity, (empresa) => empresa.usuario)
  empresas?: EmpresaEntity[];

  //Referencia a entidades para controlar quien creo a sus entidades (cliente)
  @OneToMany(() => EntidadEntity, (entidad) => entidad.usuario)
  entidades?: EntidadEntity[];

  //Referencia a users_empresa.entity
  @OneToMany(() => UsersEmpresaEntity, (usuemp) => usuemp.usuario)
  users_empresa?: UsersEmpresaEntity[];

  //Referencia a invoice.entity
  @OneToMany(() => InvoiceEntity, (invoice) => invoice.usuario)
  invoices?: InvoiceEntity[];

  @OneToMany(() => ConnectionWS, (connection) => connection.connectedUser)
  connectionsWS: ConnectionWS[];

  @BeforeInsert()
  @BeforeUpdate()
  emailAndUsernameToLowerCase() {
    this.email = this.email.toLowerCase();
    this.username = this.username.toLowerCase();
  }

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;

  @OneToMany(() => NotaVentaEntity, (notaVenta) => notaVenta.usuario)
  notaVenta?: NotaVentaEntity[];
}
