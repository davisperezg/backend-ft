import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Resource } from 'src/resource/schemas/resource.schema';
import { Role } from 'src/role/schemas/role.schema';
export type Resource_RoleDocument = Resource_Role & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class Resource_Role {
  @Prop({ requerid: true, type: Boolean })
  status: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    unique: true,
  })
  role: Role;

  @Prop({
    type: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    ],
  })
  resource: Resource[];
}

export const Resource_RoleSchema = SchemaFactory.createForClass(Resource_Role);
