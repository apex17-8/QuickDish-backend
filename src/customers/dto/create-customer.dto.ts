export class CreateCustomerDto {
  user_id: number; // Link to existing user
  loyalty_points?: number;
  default_address?: string;
  preferences?: any;
}
