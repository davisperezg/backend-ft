import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
export type OptionDocument = Option & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Option {
  @Prop({ trim: true })
  name: string;

  @Prop({ trim: true })
  status: boolean;

  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Role' })
  // role?: Role;

  // @Prop({
  //   type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  // })
  // module?: Module[];
}

export const OptionSchema = SchemaFactory.createForClass(Option);
