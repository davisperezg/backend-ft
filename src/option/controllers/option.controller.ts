import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Option } from '../schemas/option.schema';
import { OptionService } from '../services/option.service';

@Controller('api/v1/options')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Delete('/delete/:id')
  async deleteRole(@Res() res, @Param('id') id: string): Promise<boolean> {
    const roleDeleted = await this.optionService.delete_complete(id);
    return res.status(HttpStatus.OK).json({
      message: 'Deleted Successfully',
      roleDeleted,
    });
  }

  // Get Menus
  @Get()
  async getOptions(@Res() res): Promise<Option[]> {
    const menus = await this.optionService.findAll();
    return res.status(HttpStatus.OK).json(menus);
  }

  // Add Option
  @Post()
  async createOption(@Res() res, @Body() createBody: Option): Promise<Option> {
    const option = await this.optionService.create(createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Option Successfully Created',
      option,
    });
  }

  // Update Option: /options/605ab8372ed8db2ad4839d87
  @Put(':id')
  async updateOption(
    @Res() res,
    @Param('id') id: string,
    @Body() createBody: Option,
  ): Promise<Option> {
    const optionUpdated = await this.optionService.update(id, createBody);
    return res.status(HttpStatus.OK).json({
      message: 'Option Updated Successfully',
      optionUpdated,
    });
  }
}
