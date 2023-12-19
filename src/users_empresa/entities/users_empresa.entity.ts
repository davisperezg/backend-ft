import { EmpresaEntity } from 'src/empresa/entities/empresa.entity';
import { EstablecimientoEntity } from 'src/establecimiento/entities/establecimiento.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'users_empresa',
})
export class UsersEmpresaEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => UserEntity, (user) => user.users_empresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: UserEntity;

  @ManyToOne(() => EmpresaEntity, (emp) => emp.users_empresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'empresa_id' })
  empresa: EmpresaEntity;

  @ManyToOne(() => EstablecimientoEntity, (est) => est.users_empresa, {
    nullable: false,
  })
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: EstablecimientoEntity;
}
