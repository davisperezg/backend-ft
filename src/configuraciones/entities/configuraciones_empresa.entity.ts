import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';

@Entity({ name: 'configuraciones_empresa' })
export class ConfigEmpresaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  imprimir_formato_a4?: boolean;

  @ManyToOne(() => EmpresaEntity, (empresa) => empresa.configsEmpresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa?: EmpresaEntity;
}
