import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EntidadEntity } from 'src/entidades/entities/entidad.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { MonedaEntity } from 'src/monedas/entities/monedas.entity';
import { PosEntity } from 'src/pos/entities/pos.entity';
import { TipodocsEntity } from 'src/tipodocs/entities/tipodocs.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { NotaVentaDetailEntity } from './nota-venta-detail.entity';

@Entity({ name: 'notas_venta' })
@Unique('unique_notas_venta_constraint', [
  'empresa',
  'establecimiento',
  'pos',
  'tipo_doc',
  'serie',
  'correlativo',
])
export class NotaVentaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => TipodocsEntity, (tdoc) => tdoc.notaVenta, {
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

  @ManyToOne(() => MonedaEntity, (moneda) => moneda.notaVenta, {
    nullable: false,
  })
  @JoinColumn({ name: 'moneda_id' })
  tipo_moneda: MonedaEntity;

  @ManyToOne(() => EmpresaEntity, (empresa) => empresa.notaVenta, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;

  @ManyToOne(
    () => EstablecimientoEntity,
    (establecimiento) => establecimiento.notaVenta,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: EstablecimientoEntity;

  @ManyToOne(() => EntidadEntity, (entidad) => entidad.notaVenta, {
    nullable: true,
  })
  @JoinColumn({ name: 'cliente_id' })
  cliente: EntidadEntity;

  @ManyToOne(() => UserEntity, (entidad) => entidad.notaVenta, {
    nullable: false,
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

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
    type: 'text',
    nullable: true,
  })
  observaciones?: string;

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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;

  @ManyToOne(() => PosEntity, (pos) => pos.notaVenta, {
    nullable: true,
  })
  @JoinColumn({ name: 'pos_id' })
  pos: PosEntity;

  @OneToMany(() => NotaVentaDetailEntity, (detail) => detail.notaVenta)
  notaVentaDetail?: NotaVentaDetailEntity[];
}
