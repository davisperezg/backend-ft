import {
  Services_User,
  Services_UserDocument,
} from './../schemas/services-user';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ServicesUsersService {
  constructor(
    @InjectModel(Services_User.name)
    private suModel: Model<Services_UserDocument>,
  ) {}
}
