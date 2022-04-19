import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Resource } from 'src/resource/schemas/resource.schema';
import { User } from 'src/user/schemas/user.schema';
export type Resource_UserDocument = Resource_User & mongoose.Document;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Resource_User {
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
      { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    ],
  })
  resource: Resource[];
}

export const Resource_UserSchema = SchemaFactory.createForClass(Resource_User);
