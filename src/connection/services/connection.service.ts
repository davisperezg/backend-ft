import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConnectionWS } from '../entities/connection_ws.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ConnectionService {
  constructor(
    @InjectRepository(ConnectionWS)
    private connectionRepository: Repository<ConnectionWS>,
  ) {}

  async create(connection: ConnectionWS): Promise<ConnectionWS> {
    return await this.connectionRepository.save(connection);
  }

  async findByUserId(userId: number): Promise<ConnectionWS[]> {
    return await this.connectionRepository.find({
      where: {
        connectedUser: {
          id: userId,
        },
      },
    });
  }

  async findByUiidClient(uuid_client: string): Promise<ConnectionWS> {
    return await this.connectionRepository.findOne({
      where: {
        uuid_client,
      },
    });
  }

  async deleteBySocketId(socketId: string) {
    return await this.connectionRepository.delete({ socketId });
  }

  async deleteByUiid(uuid_client: string) {
    return await this.connectionRepository.delete({ uuid_client });
  }

  async deleteAll() {
    return await this.connectionRepository
      .createQueryBuilder()
      .delete()
      .execute();
  }

  async deleteAllByUser(idUser: number) {
    return await this.connectionRepository
      .createQueryBuilder()
      .delete()
      .where('connectedUser = :id', { id: idUser })
      .execute();
  }

  async findAll(): Promise<ConnectionWS[]> {
    return await this.connectionRepository.find();
  }

  async findAllByUser(userIdObj: string): Promise<ConnectionWS[]> {
    return await this.connectionRepository.find({
      where: {
        connectedUser: {
          _id: userIdObj,
        },
      },
    });
  }
}
