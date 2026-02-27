import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotaVentaEntity } from './nota-venta.entity';
import { DecimalColumnTransformer } from 'src/lib/helpers/decimal_format';
import { ProductEntity } from 'src/product/entities/product.entity';
import { PresentationEntity } from 'src/presentation/entities/presentation.entity';
import { UnidadEntity } from 'src/unidades/entities/unidades.entity';
import { IGVEntity } from 'src/igvs/entities/igvs.entity';

@Entity({ name: 'notas_venta_details' })
export class NotaVentaDetailEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => NotaVentaEntity, (notaVenta) => notaVenta.notaVentaDetail, {
    nullable: false,
  })
  @JoinColumn({ name: 'nota_venta_id' })
  notaVenta?: NotaVentaEntity;

  @Column({
    type: 'int',
  })
  cantidad: number;

  @Column({
    nullable: true,
  })
  codigo?: string;

  @ManyToOne(() => ProductEntity, (product) => product.notaVentaDetail, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  producto?: ProductEntity;

  @ManyToOne(
    () => PresentationEntity,
    (presentation) => presentation.notaVentaDetail,
    {
      nullable: true,
    },
  )
  @JoinColumn({ name: 'presentation_id' })
  presentation?: PresentationEntity;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion?: string;

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
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  porcentajeIgv: number;

  @ManyToOne(() => UnidadEntity, (unidad) => unidad.notaVentaDetail, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: UnidadEntity;

  @ManyToOne(() => IGVEntity, (igv) => igv.notaVentaDetail, {
    nullable: false,
  })
  @JoinColumn({ name: 'tipo_igv_id' })
  tipAfeIgv: IGVEntity;
}
