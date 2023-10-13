import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'provincias' })
export class ProvinciaEntity {
  @PrimaryColumn({ type: 'char', length: 4 })
  id: string;

  @Column()
  provincia: string;
}
