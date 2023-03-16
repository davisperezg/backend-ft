import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
export type GroupsresourcesDocument = Groupsresources & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Groupsresources {
  @Prop({ default: true })
  status?: boolean;

  @Prop({ trim: true })
  name: string;
}

export const GroupsresourcesSchema =
  SchemaFactory.createForClass(Groupsresources);
