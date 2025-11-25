import { IsNumber } from 'class-validator';

export class MarkMessageReadDto {
  @IsNumber()
  userId: number;
}
