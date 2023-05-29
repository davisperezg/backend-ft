import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Menu } from 'src/menu/schemas/menu.schema';
import { User } from 'src/user/schemas/user.schema';
export type ModuleDocument = Module & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Module {
  @Prop({ trim: true, uppercase: true })
  name: string;

  @Prop({ trim: true, uppercase: true })
  description: string;

  @Prop({ trim: true })
  status: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
  })
  menu?: Menu[];

  @Prop({ trim: true, type: String })
  color?: string;

  @Prop({ trim: true, type: String })
  icon?: string;

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
}

export const ModuleSchema = SchemaFactory.createForClass(Module);
