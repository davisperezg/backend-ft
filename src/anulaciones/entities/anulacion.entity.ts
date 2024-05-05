import { InvoiceEntity } from 'src/invoice/entities/invoice.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'anulaciones' })
export class AnulacionEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'datetime',
  })
  fecha_comunicacion: Date;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.anulaciones, {
    nullable: false,
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({
    type: 'char',
    length: 5,
  })
  numero: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  ticket: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  respuesta?: string;
}
