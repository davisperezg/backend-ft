import { IGVEntity } from 'src/igvs/entities/igvs.entity';
import { UnidadEntity } from 'src/unidades/entities/unidades.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { ProductEntity } from 'src/product/entities/product.entity';

@Entity({ name: 'invoices_details' })
export class InvoiceDetailsEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.invoices_details, {
    nullable: false,
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity;

  @Column({
    type: 'int',
  })
  cantidad: number;

  //solo permite generar fact
  @Column({
    nullable: true,
  })
  codigo?: string;

  @ManyToOne(() => ProductEntity, (product) => product.invoices_details, {
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  producto: ProductEntity;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion?: string;
  //finsolo permite generar fact

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   igv: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   igvUnitario: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   mtoBaseIgv: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 3,
  //     nullable: false,
  //     default: null,
  //   })
  //   mtoPrecioUnitario: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 3,
  //     nullable: true,
  //     default: null,
  //   })
  //   mtoPrecioUnitarioGratuito?: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   mtoTotalItem: number;

  @Column({
    type: 'decimal',
    precision: 22,
    scale: 10,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mtoValorUnitario: number;

  @Column({
    type: 'decimal',
    precision: 22,
    scale: 10,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mtoValorGratuito?: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   mtoValorVenta: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  porcentajeIgv: number;

  //   @Column({
  //     type: 'decimal',
  //     precision: 10,
  //     scale: 2,
  //     nullable: false,
  //     default: null,
  //   })
  //   totalImpuestos: number;

  @ManyToOne(() => UnidadEntity, (unidad) => unidad.invoices_details, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: UnidadEntity;

  @ManyToOne(() => IGVEntity, (igv) => igv.invoices_details, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipo_igv_id' })
  tipAfeIgv: IGVEntity;
}
