import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'distritos' })
export class DistritoEntity {
  @PrimaryColumn({ type: 'char', length: 6 })
  id: string;

  @Column()
  distrito: string;
}
