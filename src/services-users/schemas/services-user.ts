import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Resource } from 'src/resource/schemas/resource.schema';
import { User } from 'src/user/schemas/user.schema';
export type Services_UserDocument = Services_User & mongoose.Document;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Services_User {
  @Prop({ requerid: true, type: Boolean })
  status: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: User;

  @Prop({
    type: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    ],
  })
  module: Resource[];
}

export const ServicesUserSchema = SchemaFactory.createForClass(Services_User);
