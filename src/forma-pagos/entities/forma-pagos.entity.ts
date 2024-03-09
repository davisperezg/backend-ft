import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity({ name: 'forma_pagos' })
export class FormaPagosEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  forma_pago: string;

  @Column({
    default: true,
  })
  estado: boolean;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.forma_pago)
  invoices?: InvoiceEntity[];
}
