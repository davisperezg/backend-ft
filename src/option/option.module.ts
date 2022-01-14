import { Module } from '@nestjs/common';
import { OptionController } from './controllers/option.controller';
import { OptionService } from './services/option.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Option, OptionSchema } from './schemas/option.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Option.name, schema: OptionSchema }]),
  ],
  controllers: [OptionController],
  providers: [OptionService],
})
export class OptionModule {}
