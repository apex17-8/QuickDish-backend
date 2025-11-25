import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { MenuItem } from '../../menu_items/entities/menu_item.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  order_item_id: number; 

  @ManyToOne(() => Order, (order) => order.orderItems, {
    nullable: false,
    onDelete: 'CASCADE', // Delete order items when order is deleted
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => MenuItem, {
    nullable: false,
    eager: true, // Always load menu item details
  })
  @JoinColumn({ name: 'menu_item_id' })
  menu_item: MenuItem;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_at_purchase: number; // Price when ordered (protects against menu price changes)

  @Column({ type: 'text', nullable: true })
  special_instructions: string; // "No onions", "Extra sauce", etc.

  // Calculated property (not stored in DB)
  get subtotal(): number {
    return this.price_at_purchase * this.quantity;
  }
}
