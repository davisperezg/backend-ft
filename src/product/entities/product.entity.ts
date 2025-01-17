import { InvoiceDetailsEntity } from 'src/invoice/entities/invoice_details.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import {
  Column,
  CreateDateColumn,
  Entity,
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
    default: 18,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  porcentajeIgv: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    transformer: new DecimalColumnTransformer(),
  })
  stock_global: number;

  @Column({ default: true })
  estado?: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.producto)
  invoices_details?: InvoiceDetailsEntity[];
}
