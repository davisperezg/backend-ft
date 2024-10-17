import { CodeReturnSunatEnum } from 'src/lib/enum/codes-return-sunat';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'codes_return_sunat' })
export class CodesReturnSunatEntity {
  @PrimaryColumn({ type: 'char', length: 4 })
  codigo_retorno: string;

  @Column()
  tipo_retorno: string;

  @Column()
  mensaje_retorno: string;

  @Column({
    type: 'enum',
    enum: CodeReturnSunatEnum,
    nullable: true, // Permite valores null
  })
  grupo?: CodeReturnSunatEnum;
}
