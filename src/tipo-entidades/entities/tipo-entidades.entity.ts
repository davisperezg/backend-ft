import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'tipo_entidades' })
export class TipoEntidadEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  tipo_entidad: string;

  @Column({
    type: 'char',
    length: 1,
  })
  codigo: string;

  @Column()
  descripcion: string;

  @Column()
  abreviatura: string;

  @Column({
    default: true,
  })
  estado: boolean;

  //Referencia a entidades para controlar quien creo a sus entidades (cliente)
  @OneToMany(() => EntidadEntity, (entidad) => entidad.tipo_entidad)
  entidades?: EntidadEntity[];
}
