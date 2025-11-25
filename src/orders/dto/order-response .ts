import { OrderStatus } from '../entities/order.entity';

export class OrderResponseDto {
  order_id: number;
  total_price: number;
  status: OrderStatus;
  delivery_address: string;
  notes?: string;
  customer_confirmed: boolean;
  rider_confirmed: boolean;
  assigned_at?: Date;
  accepted_at?: Date;
  picked_up_at?: Date;
  assignment_attempts: number;
  requires_manual_assignment: boolean;
  customer_rating?: number;
  customer_feedback?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  created_at: Date;
  updated_at: Date;
  
  // Relationships
  customer: {
    customer_id: number;
    user: {
      name: string;
      phone: string;
    };
  };
  
  restaurant: {
    restaurant_id: number;
    name: string;
    address: string;
    phone: string;
  };
  
  rider?: {
    rider_id: number;
    user: {
      name: string;
      phone: string;
    };
    vehicle_type: string;
    rating: number;
  };
  
  orderItems?: Array<{
    order_item_id: number;
    quantity: number;
    price_at_purchase: number;
    special_instructions?: string;
    menu_item: {
      menu_item_id: number;
      name: string;
      price: number;
    };
  }>;
  
  // Virtual properties
  calculated_total: number;
  can_be_cancelled: boolean;
  can_confirm_delivery: boolean;
  assignment_expired: boolean;
  estimated_delivery_time?: Date;
}

export class OrderListResponseDto {
  orders: OrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}