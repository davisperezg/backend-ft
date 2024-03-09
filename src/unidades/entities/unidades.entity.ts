import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'unidades' })
export class UnidadEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'char',
    length: 3,
  })
  codigo: string;

  @Column()
  unidad: string;

  @Column({
    default: true,
  })
  estado: boolean;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.unidad)
  invoices_details?: InvoiceDetailsEntity[];
}
