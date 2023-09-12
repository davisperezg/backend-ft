import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { EmpresaEntity } from '../../empresa/entities/empresa.entity';

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

  @OneToMany(() => EmpresaEntity, (empresa) => empresa.usuario)
  empresas?: EmpresaEntity[];
}
