import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import { NotaVentaDetailEntity } from 'src/nota-venta/entities/nota-venta-detail.entity';
import { ProductEntity } from 'src/product/entities/product.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'tipo_igvs' })
export class IGVEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'char',
    length: 2,
  })
  codigo: string;

  @Column()
  tipo_igv: string;

  @Column({
    type: 'char',
    length: 4,
  })
  codigo_de_tributo: string;

  @Column()
  categoria: string;

  @Column({
    default: true,
  })
  estado: boolean;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.tipAfeIgv)
  invoices_details?: InvoiceDetailsEntity[];

  @OneToMany(() => ProductEntity, (product) => product.tipAfeIgv)
  products?: ProductEntity[];

  @OneToMany(() => NotaVentaDetailEntity, (detail) => detail.tipAfeIgv)
  notaVentaDetail?: NotaVentaDetailEntity[];
}
