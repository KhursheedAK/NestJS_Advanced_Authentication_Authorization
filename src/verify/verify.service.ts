import { Injectable } from '@nestjs/common';
import { CreateVerifyDto } from './dto/create-verify.dto';
import { UpdateVerifyDto } from './dto/update-verify.dto';

@Injectable()
export class VerifyService {
  create(createVerifyDto: CreateVerifyDto) {
    return 'This action adds a new verify';
  }

  findAll() {
    return `This action returns all verify`;
  }

  findOne(id: number) {
    return `This action returns a #${id} verify`;
  }

  update(id: number, updateVerifyDto: UpdateVerifyDto) {
    return `This action updates a #${id} verify`;
  }

  remove(id: number) {
    return `This action removes a #${id} verify`;
  }
}
