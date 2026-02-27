import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { NotaVentaEntity } from 'src/nota-venta/entities/nota-venta.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'monedas' })
export class MonedaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  moneda: string;

  @Column({
    type: 'char',
    length: 3,
  })
  abreviado: string;

  @Column({
    type: 'char',
    length: 3,
  })
  abrstandar: string;

  @Column({
    type: 'char',
    length: 5,
  })
  simbolo: string;

  @Column({
    default: true,
  })
  estado: boolean;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.tipo_moneda)
  invoices?: InvoiceEntity[];

  @OneToMany(() => NotaVentaEntity, (notaVenta) => notaVenta.tipo_moneda)
  notaVenta?: NotaVentaEntity[];
}
