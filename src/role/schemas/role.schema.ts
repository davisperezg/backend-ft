import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Module } from 'src/module/schemas/module.schema';
import { User } from 'src/user/schemas/user.schema';
export type RoleDocument = Role & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Role {
  @Prop({ trim: true, uppercase: true, requerid: true })
  name: string;

  @Prop({ trim: true, uppercase: true })
  description: string;

  @Prop({ trim: true, requerid: true })
  status: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  creator: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  deletedBy: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  updatedBy: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  restoredBy: User;

  @Prop()
  deletedAt?: Date;

  @Prop()
  restoredAt?: Date;

  @Prop({
    type: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    ],
  })
  module: Module[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
