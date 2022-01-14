import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Module } from 'src/module/schemas/module.schema';
export type RoleDocument = Role & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Role {
  @Prop({ trim: true, unique: true, uppercase: true })
  name: string;

  @Prop({ trim: true, uppercase: true })
  description: string;

  @Prop({ trim: true })
  status: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  })
  module?: Module[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
