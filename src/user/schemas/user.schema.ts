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

  @Prop({ trim: true, requerid: true })
  nroDocument: string;

  @Prop({ trim: true, requerid: true, lowercase: true })
  email: string;

  @Prop({ trim: true, requerid: true, unique: true, lowercase: true })
  username: string;

  @Prop({ trim: true, requerid: true })
  password: string;

  @Prop({ trim: true, requerid: true })
  status: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    trim: true,
  })
  role: Role;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  creator: User;

  @Prop()
  deletedAt?: Date;

  @Prop()
  restoredAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
