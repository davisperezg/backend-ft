import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { EnvioSunatModo } from 'src/lib/enum/envio_sunat_modo.enum';
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

  // Modo de envío a SUNAT
  @Column({
    type: 'enum',
    enum: EnvioSunatModo,
    default: EnvioSunatModo.INMEDIATO, // Valor por defecto
  })
  envio_sunat_modo: string;

  // Habilitar envios automáticos mediante jobs
  @Column({
    type: 'boolean',
    default: false, // Por defecto no habilitado
  })
  envio_sunat_job: boolean;

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
