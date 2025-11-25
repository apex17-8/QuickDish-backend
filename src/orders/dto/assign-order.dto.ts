import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignRiderDto {
  @IsInt()
  @IsNotEmpty()
  rider_id: number;
}