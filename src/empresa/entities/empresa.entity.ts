import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { TipodocsEmpresaEntity } from 'src/tipodocs_empresa/entities/tipodocs_empresa.entity';

@Entity({ name: 'empresas' })
export class EmpresaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true })
  logo?: string;

  @Column()
  ruc: string;

  @Column()
  razon_social: string;

  @Column()
  nombre_comercial: string;

  @Column({ nullable: true })
  web_service: string;

  @Column({ nullable: true })
  fieldname_cert: string;

  @Column({ nullable: true })
  cert: string;

  @Column({ nullable: true })
  cert_password: string;

  @Column()
  modo: number;

  @Column()
  ose_enabled: boolean;

  @Column({ nullable: true })
  usu_secundario_user?: string;

  @Column({ nullable: true })
  usu_secundario_password?: string;

  @Column({ nullable: true })
  usu_secundario_ose_user?: string;

  @Column({ nullable: true })
  usu_secundario_ose_password?: string;

  @Column({ default: true })
  estado?: boolean;

  @ManyToOne(() => UserEntity, (user) => user.empresas, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  usuario?: UserEntity;

  @OneToMany(() => TipodocsEmpresaEntity, (tipemp) => tipemp.empresa)
  tipodoc_empresa?: TipodocsEmpresaEntity[];
}
