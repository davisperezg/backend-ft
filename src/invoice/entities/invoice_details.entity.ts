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

  @Column({
    nullable: true,
  })
  producto?: string;
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
    precision: 10,
    scale: 3,
    nullable: false,
    default: null,
  })
  mtoValorUnitario: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
    default: null,
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
