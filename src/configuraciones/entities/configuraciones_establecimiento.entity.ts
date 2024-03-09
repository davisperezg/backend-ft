import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';

@Entity({ name: 'configuraciones_establecimiento' })
export class ConfigEstablecimientoEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  //opciones
  @Column({
    default: true,
  })
  enviar_inmediatamente_a_sunat?: boolean;

  @ManyToOne(() => EmpresaEntity, (empresa) => empresa.configsEmpresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa?: EmpresaEntity;

  @ManyToOne(
    () => EstablecimientoEntity,
    (user) => user.configsEstablecimiento,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento?: EstablecimientoEntity;
}
