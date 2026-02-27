import { IGVEntity } from 'src/igvs/entities/igvs.entity';
import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { NotaVentaDetailEntity } from 'src/nota-venta/entities/nota-venta-detail.entity';
import { PresentationEntity } from 'src/presentation/entities/presentation.entity';
import { UnidadEntity } from 'src/unidades/entities/unidades.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  codigo?: string;

  @Column({
    type: 'varchar',
    length: 185,
  })
  nombre: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion?: string;

  @Column({
    type: 'decimal',
    precision: 22,
    scale: 10,
    nullable: false,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  mtoValorUnitario: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  stock: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  min_stock: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  purchase_price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  max_profit: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  min_profit: number;

  @Column({ default: true })
  estado?: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.producto)
  invoices_details?: InvoiceDetailsEntity[];

  @ManyToOne(() => IGVEntity, (igv) => igv.products, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipo_igv_id' })
  tipAfeIgv: IGVEntity;

  @ManyToOne(() => UnidadEntity, (unidad) => unidad.products, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: UnidadEntity;

  @OneToMany(() => PresentationEntity, (presentation) => presentation.product)
  presentations?: PresentationEntity[];

  @OneToMany(() => NotaVentaDetailEntity, (detail) => detail.producto)
  notaVentaDetail?: NotaVentaDetailEntity[];
}
