import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'configuraciones_usuario' })
export class ConfigUsuarioEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  //opciones
  @Column({
    default: true,
  })
  vender_sin_stock?: boolean;
}
