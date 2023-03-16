import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationErrorException extends HttpException {
  data: any;
  constructor(data: any) {
    super('Bad Request', HttpStatus.BAD_REQUEST);
    this.data = data;
  }
  getData() {
    return this.data;
  }
}
