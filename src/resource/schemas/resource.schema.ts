import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
export type ResourceDocument = Resource & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Resource {
  @Prop({ requerid: true, type: Boolean })
  status: boolean;

  @Prop({ requerid: true, type: String })
  name: string;

  @Prop({ requerid: true, type: String })
  key: string;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
