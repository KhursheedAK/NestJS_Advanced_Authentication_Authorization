import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VerifyService } from './verify.service';
import { CreateVerifyDto } from './dto/create-verify.dto';
import { UpdateVerifyDto } from './dto/update-verify.dto';

@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post()
  create(@Body() createVerifyDto: CreateVerifyDto) {
    return this.verifyService.create(createVerifyDto);
  }

  @Get()
  findAll() {
    return this.verifyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verifyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVerifyDto: UpdateVerifyDto) {
    return this.verifyService.update(+id, updateVerifyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.verifyService.remove(+id);
  }
}
