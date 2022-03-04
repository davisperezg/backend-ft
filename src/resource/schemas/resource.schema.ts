import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Role } from 'src/role/schemas/role.schema';
export type ResourceDocument = Resource & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Resource {
  // @Prop({ requerid: true, type: Boolean })
  // status: boolean;

  // @Prop({
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Role',
  //   required: true,
  //   unique: true,
  // })
  // role: Role;

  // @Prop({ type: Boolean })
  // canDelete_usu?: boolean;

  // @Prop({ type: Boolean })
  // canRead_usu?: boolean;

  // @Prop({ type: Boolean })
  // canPrint_roles?: boolean;

  @Prop({ requerid: true, type: Boolean })
  status: boolean;

  @Prop({ requerid: true, type: String })
  name: string;

  @Prop({ requerid: true, type: String })
  key: string;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
