import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { ProductEntity } from 'src/product/entities/product.entity';
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

@Entity({ name: 'presentations' })
export class PresentationEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  nombre: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  quantity: number;

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
  unit_price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  sales_price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  min_price: number;

  @Column({ default: true })
  estado?: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;

  @ManyToOne(() => UnidadEntity, (unidad) => unidad.products, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: UnidadEntity;

  @ManyToOne(() => ProductEntity, (product) => product.presentations, {
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.presentation)
  invoices_details?: InvoiceDetailsEntity[];
}
