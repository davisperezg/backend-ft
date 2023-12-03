import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';
import { UsersEmpresaEntity } from 'src/users_empresa/entities/users_empresa.entity';

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

  //Referencia a users_empresa.entity
  @OneToMany(() => UsersEmpresaEntity, (usuemp) => usuemp.usuario)
  users_empresa?: UsersEmpresaEntity[];
}
