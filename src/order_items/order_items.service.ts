import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order_item.entity';
import { Order } from '../orders/entities/order.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateOrderItemDto } from './dto/create-order_item.dto';
import { UpdateOrderItemDto } from './dto/update-order_item.dto';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  //Create a new order item

  async create(createOrderItemDto: CreateOrderItemDto): Promise<OrderItem> {
    // Verify order exists
    const order = await this.orderRepository.findOne({
      where: { order_id: createOrderItemDto.order_id },
    });
    if (!order) {
      throw new NotFoundException(
        `Order ${createOrderItemDto.order_id} not found`,
      );
    }

    // Verify menu item exists and get current price
    const menuItem = await this.menuItemRepository.findOne({
      where: { menu_item_id: createOrderItemDto.menu_item_id },
    });
    if (!menuItem) {
      throw new NotFoundException(
        `Menu item ${createOrderItemDto.menu_item_id} not found`,
      );
    }

    // Check if menu item is available
    if (!menuItem.is_available) {
      throw new NotFoundException(
        `Menu item ${menuItem.name} is not available`,
      );
    }

    const orderItem = this.orderItemRepository.create({
      order: order,
      menu_item: menuItem,
      quantity: createOrderItemDto.quantity,
      price_at_purchase: menuItem.price,
      special_instructions: createOrderItemDto.special_instructions,
    });

    const savedItem = await this.orderItemRepository.save(orderItem);

    // Update order total
    await this.updateOrderTotal(createOrderItemDto.order_id);

    return savedItem;
  }

  // Get all order items

  async findAll(): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      relations: ['menu_item', 'order'],
    });
  }

  // Get order items for a specific order

  async findByOrder(orderId: number): Promise<OrderItem[]> {
    return this.orderItemRepository.find({
      where: { order: { order_id: orderId } },
      relations: ['menu_item'],
      order: { order_item_id: 'ASC' },
    });
  }

  // Get a single order item

  async findOne(id: number): Promise<OrderItem> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { order_item_id: id },
      relations: ['menu_item', 'order'],
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item ${id} not found`);
    }

    return orderItem;
  }

  //Update an order item

  async update(
    id: number,
    updateOrderItemDto: UpdateOrderItemDto,
  ): Promise<OrderItem> {
    const orderItem = await this.findOne(id);

    if (updateOrderItemDto.quantity !== undefined) {
      orderItem.quantity = updateOrderItemDto.quantity;
    }

    if (updateOrderItemDto.special_instructions !== undefined) {
      orderItem.special_instructions = updateOrderItemDto.special_instructions;
    }

    const updatedItem = await this.orderItemRepository.save(orderItem);

    // Update order total if quantity changed
    if (updateOrderItemDto.quantity !== undefined) {
      await this.updateOrderTotal(orderItem.order.order_id);
    }

    return updatedItem;
  }

  //Remove an order item

  async remove(id: number): Promise<void> {
    const orderItem = await this.findOne(id);
    const orderId = orderItem.order.order_id;

    await this.orderItemRepository.remove(orderItem);

    // Update order total after removal
    await this.updateOrderTotal(orderId);
  }

  // Bulk create order items for an order

  async createBulk(
    orderId: number,
    items: CreateOrderItemDto[],
  ): Promise<OrderItem[]> {
    const order = await this.orderRepository.findOne({
      where: { order_id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const orderItems = await Promise.all(
      items.map(async (itemDto) => {
        const menuItem = await this.menuItemRepository.findOne({
          where: { menu_item_id: itemDto.menu_item_id },
        });

        if (!menuItem) {
          throw new NotFoundException(
            `Menu item ${itemDto.menu_item_id} not found`,
          );
        }

        if (!menuItem.is_available) {
          throw new NotFoundException(
            `Menu item ${menuItem.name} is not available`,
          );
        }

        return this.orderItemRepository.create({
          order: order,
          menu_item: menuItem,
          quantity: itemDto.quantity,
          price_at_purchase: menuItem.price,
          special_instructions: itemDto.special_instructions,
        });
      }),
    );

    const savedItems = await this.orderItemRepository.save(orderItems);

    // Update order total
    await this.updateOrderTotal(orderId);

    return savedItems;
  }

  // Update order total based on order items

  private async updateOrderTotal(orderId: number): Promise<void> {
    const orderItems = await this.findByOrder(orderId);
    const total = orderItems.reduce(
      (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
      0,
    );

    await this.orderRepository.update(orderId, {
      total_price: total,
    });
  }

  //Get order summary with item details

  async getOrderSummary(orderId: number): Promise<{
    items: OrderItem[];
    subtotal: number;
    itemCount: number;
  }> {
    const items = await this.findByOrder(orderId);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);

    return {
      items,
      subtotal,
      itemCount,
    };
  }
}
