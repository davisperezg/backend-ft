import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Groupsresources } from 'src/groups-resources/schemas/groups-resources.schema';
export type ResourceDocument = Resource & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Resource {
  @Prop({ requerid: true, type: Boolean, default: true })
  status: boolean;

  @Prop({ requerid: true, type: String, unique: true, trim: true })
  name: string;

  @Prop({ requerid: true, type: String, unique: true, trim: true })
  key: string;

  @Prop({ trim: true, uppercase: true })
  description: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Groupsresources',
    required: true,
    trim: true,
  })
  group_resource: Groupsresources;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
