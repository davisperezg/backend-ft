import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'invoices' })
export class InvoiceEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  tipo_operacion: string;

  @Column()
  tipo_doc: string;

  @Column()
  serie: string;

  @Column()
  correlativo: string;

  @Column()
  fecha_emision: string;

  @Column()
  forma_pago: string;

  @Column()
  tipo_moneda: string;

  @Column()
  company: string;

  @Column()
  client: string;

  @Column()
  mto_operaciones_gravadas: string;

  @Column()
  mto_igv: string;

  @Column()
  total_impuestos: string;

  @Column()
  valor_venta: string;

  @Column()
  subtotal: string;

  @Column()
  mto_imp_venta: string;
}
