import { UserEntity } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'conexiones_ws' })
export class ConnectionWS {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  socketId: string;

  // one user could have many Connections, e.g. one on his desktop and one on mobile
  @ManyToOne(() => UserEntity, (user) => user.connectionsWS)
  @JoinColumn({ name: 'user_id' })
  connectedUser: UserEntity;

  @Column()
  socketIdClient: string;

  @Column()
  uuid_client: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;
}
