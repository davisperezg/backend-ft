import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
