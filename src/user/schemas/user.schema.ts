import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Role } from 'src/role/schemas/role.schema';
export type UserDocument = User & mongoose.Document;

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ trim: true, requerid: true, uppercase: true })
  name: string;

  @Prop({ trim: true, requerid: true, uppercase: true })
  lastname: string;

  @Prop({ trim: true, requerid: true, uppercase: true })
  tipDocument: string;

  @Prop({ trim: true, requerid: true, unique: true })
  nroDocument: string;

  @Prop({ trim: true, requerid: true, unique: true })
  email: string;

  @Prop({ trim: true })
  username: string;

  @Prop({ trim: true })
  password: string;

  @Prop({ trim: true })
  status: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);
