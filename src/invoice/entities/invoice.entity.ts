import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { FormaPagosEntity } from 'src/forma-pagos/entities/forma-pagos.entity';
import { MonedaEntity } from 'src/monedas/entities/monedas.entity';
import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { InvoiceDetailsEntity } from './invoice_details.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { AnulacionEntity } from 'src/anulaciones/entities/anulacion.entity';

@Entity({ name: 'invoices' })
export class InvoiceEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    type: 'char',
    length: 4,
  })
  tipo_operacion: string;

  @ManyToOne(() => TipodocsEntity, (tdoc) => tdoc.invoices, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipodoc_id' })
  tipo_doc: TipodocsEntity;

  @Column({
    type: 'char',
    length: 4,
  })
  serie: string;

  @Column({
    type: 'char',
    length: 8,
  })
  correlativo: string;

  @Column({
    type: 'datetime',
  })
  fecha_emision: Date;

  @Column({
    type: 'date',
    nullable: true,
    default: null,
  })
  fecha_vencimiento: Date;

  @ManyToOne(() => FormaPagosEntity, (fpago) => fpago.invoices, {
    nullable: false,
  })
  @JoinColumn({ name: 'formapago_id' })
  forma_pago: FormaPagosEntity;

  @ManyToOne(() => MonedaEntity, (moneda) => moneda.invoices, {
    nullable: false,
  })
  @JoinColumn({ name: 'moneda_id' })
  tipo_moneda: MonedaEntity;

  @ManyToOne(() => EmpresaEntity, (empresa) => empresa.invoices, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;

  @ManyToOne(
    () => EstablecimientoEntity,
    (establecimiento) => establecimiento.invoices,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: EstablecimientoEntity;

  @ManyToOne(() => EntidadEntity, (entidad) => entidad.invoices, {
    nullable: true,
  })
  @JoinColumn({ name: 'cliente_id' })
  cliente: EntidadEntity;

  @ManyToOne(() => UserEntity, (entidad) => entidad.invoices, {
    nullable: false,
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  //crea una columna de tipo decimal(10,2)
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_operaciones_gravadas?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_operaciones_exoneradas?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_operaciones_inafectas?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_operaciones_exportacion?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_operaciones_gratuitas?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_igv?: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    default: null,
    transformer: new DecimalColumnTransformer(),
  })
  mto_igv_gratuitas?: number;

  //por el momento solo es estatico ya que el % se aplica en el mismo servicio
  //esto se usara mas adelante
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  porcentaje_igv: number;

  @Column({
    type: 'tinyint',
    default: 0, //0 es creado, 1 es enviando, 2 es aceptado, 3 es rechazado, 4 error_contribuyente(excepcion)
  })
  estado_operacion?: number;

  @Column({
    type: 'tinyint',
    default: null, //null es anulacion no enviada, 1 es anulacion enviada(con recepcion ticked), 2 anulacion aceptada, 3 anulacion rechazada
    nullable: true,
  })
  estado_anulacion?: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  respuesta_sunat_codigo?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  respuesta_sunat_descripcion?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  respuesta_anulacion_codigo?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  respuesta_anulacion_descripcion?: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '2.1',
  })
  UBLVersionID?: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '2.0',
  })
  CustomizationID?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones_invoice?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observaciones_sunat?: string;

  //Para plan solo facturacion
  @Column({
    type: 'varchar',
    nullable: true,
  })
  entidad: string;

  @Column({
    type: 'char',
    length: 1,
    nullable: true,
  })
  entidad_tipo: string;

  @Column({
    nullable: true,
  })
  entidad_documento: string;

  @Column({
    nullable: true,
  })
  entidad_direccion: string;
  //Fin Para plan solo facturacion

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;

  @OneToMany(() => InvoiceDetailsEntity, (detail) => detail.invoice)
  invoices_details?: InvoiceDetailsEntity[];

  @OneToMany(() => AnulacionEntity, (anulacion) => anulacion.invoice)
  anulaciones?: AnulacionEntity[];

  @Column({ default: false })
  borrador?: boolean;
}
