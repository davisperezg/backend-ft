import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Menu } from 'src/menu/schemas/menu.schema';
export type ModuleDocument = Module & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Module {
  @Prop({ trim: true, unique: true })
  name: string;

  @Prop({ trim: true })
  status: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
  })
  menu?: Menu[];
}

export const ModuleSchema = SchemaFactory.createForClass(Module);
