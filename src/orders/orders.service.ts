import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Rider } from '../riders/entities/rider.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { OrderItem } from '../order_items/entities/order_item.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { Message } from '../messages/entities/message.entity';
import { OrderGateway } from '../websockets/gateways/order.gateway';
import { OrderItemsService } from '../order_items/order_items.service';
import { CreateOrderItemDto } from '../order_items/dto/create-order_item.dto';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Rider)
    private readonly riderRepo: Repository<Rider>,

    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    private readonly orderGateway: OrderGateway,

    private readonly orderItemsService: OrderItemsService,
  ) {}

  // -----------------------------
  // GET ALL ORDERS
  // -----------------------------
  async findAll(): Promise<Order[]> {
    return this.orderRepo.find({
      relations: ['rider', 'restaurant', 'orderItems', 'messages', 'customer'],
      order: { created_at: 'DESC' },
    });
  }

  // -----------------------------
  // GET ONE ORDER
  // -----------------------------
  async findOne(orderId: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
      relations: ['rider', 'restaurant', 'orderItems', 'messages', 'customer'],
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  // -----------------------------
  // GET ORDER WITH DETAILED ITEMS
  // -----------------------------
  async findOrderWithDetails(orderId: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
      relations: [
        'customer',
        'restaurant',
        'rider',
        'orderItems',
        'orderItems.menu_item',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  // -----------------------------
  // CREATE ORDER WITH ITEMS
  // -----------------------------
  async createOrderWithItems(createOrderDto: {
    customer_id: number;
    restaurant_id: number;
    delivery_address: string;
    notes?: string;
    items: CreateOrderItemDto[];
  }): Promise<Order> {
    // Verify restaurant exists
    const restaurant = await this.restaurantRepo.findOne({
      where: { restaurant_id: createOrderDto.restaurant_id },
    });
    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant ${createOrderDto.restaurant_id} not found`,
      );
    }

    // Verify customer exists
    const customer = await this.customerRepo.findOne({
      where: { customer_id: createOrderDto.customer_id },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${createOrderDto.customer_id} not found`,
      );
    }

    // Create the order first
    const order = this.orderRepo.create({
      customer: customer,
      restaurant: restaurant,
      delivery_address: createOrderDto.delivery_address,
      notes: createOrderDto.notes,
      status: OrderStatus.Pending,
      total_price: 0, // Will be calculated by order items
    });

    const savedOrder = await this.orderRepo.save(order);

    try {
      // Create order items using the service
      await this.orderItemsService.createBulk(
        savedOrder.order_id,
        createOrderDto.items,
      );

      // Notify restaurant about new order
      this.orderGateway.broadcastOrderUpdate({
        orderId: savedOrder.order_id,
        type: 'statusUpdate',
        status: OrderStatus.Pending,
      });

      // Return the complete order with items
      return this.findOrderWithDetails(savedOrder.order_id);
    } catch (error) {
      // If item creation fails, delete the order to maintain consistency
      await this.orderRepo.delete(savedOrder.order_id);
      throw error;
    }
  }

  // -----------------------------
  // ASSIGN RIDER
  // -----------------------------
  async assignRider(orderId: number, riderId: number): Promise<Order> {
    const order = await this.findOne(orderId);
    const rider = await this.riderRepo.findOne({
      where: { rider_id: riderId },
      relations: ['user'],
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${riderId} not found`);
    }

    if (!rider.is_online) {
      throw new BadRequestException(`Rider ${riderId} is not online`);
    }

    order.rider = rider;
    order.assigned_at = new Date();
    const savedOrder = await this.orderRepo.save(order);

    // Notify about rider assignment
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'riderAssigned',
      riderId,
    });

    // Notify rider about new assignment
    // You can implement rider notification logic here

    return savedOrder;
  }

  // -----------------------------
  // UPDATE STATUS
  // -----------------------------
  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(orderId);
    const previousStatus = order.status;
    order.status = status;

    // Set timestamps based on status changes
    if (
      status === OrderStatus.Accepted &&
      previousStatus === OrderStatus.Pending
    ) {
      order.assigned_at = new Date();
    } else if (
      status === OrderStatus.OnRoute &&
      previousStatus === OrderStatus.Preparing
    ) {
      order.picked_up_at = new Date();
    }

    const savedOrder = await this.orderRepo.save(order);

    // Broadcast status update
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'statusUpdate',
      status,
    });

    return savedOrder;
  }

  // -----------------------------
  // CALCULATE TOTAL USING ORDERITEMS
  // -----------------------------
  async calculateTotal(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (!order.orderItems || order.orderItems.length === 0) {
      order.total_price = 0;
      return this.orderRepo.save(order);
    }

    const total = order.orderItems.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );

    order.total_price = total;
    return this.orderRepo.save(order);
  }

  // -----------------------------
  // CUSTOMER CONFIRMS DELIVERY
  // -----------------------------
  async confirmDeliveredByCustomer(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.AwaitingConfirmation) {
      throw new BadRequestException('Order is not awaiting confirmation');
    }

    order.customer_confirmed = true;
    await this.orderRepo.save(order);

    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'orderDelivered',
    });

    return this.finalizeDeliveryIfReady(orderId);
  }

  // -----------------------------
  // RIDER CONFIRMS DELIVERY
  // -----------------------------
  async confirmDeliveredByRider(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.AwaitingConfirmation) {
      throw new BadRequestException('Order is not awaiting confirmation');
    }

    order.rider_confirmed = true;
    await this.orderRepo.save(order);

    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'orderDelivered',
    });

    return this.finalizeDeliveryIfReady(orderId);
  }

  // -----------------------------
  // FINALIZE DELIVERY IF BOTH CONFIRM
  // -----------------------------
  async finalizeDeliveryIfReady(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (!order.customer_confirmed || !order.rider_confirmed) {
      return order; // Not ready yet
    }

    order.status = OrderStatus.Delivered;
    const savedOrder = await this.orderRepo.save(order);

    // Auto-clear chat messages after delivery
    await this.messageRepo.softDelete({ order: { order_id: orderId } });

    // Broadcast final delivery confirmation
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'orderDelivered',
    });
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'chatCleared',
    });

    return savedOrder;
  }

  // -----------------------------
  // SUBMIT RATING
  // -----------------------------
  async submitRating(
    orderId: number,
    rating: number,
    feedback: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.Delivered) {
      throw new BadRequestException(`Order must be delivered first`);
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    order.customer_rating = rating;
    order.customer_feedback = feedback;

    // Update rider rating if rider exists
    if (order.rider) {
      const rider = await this.riderRepo.findOne({
        where: { rider_id: order.rider.rider_id },
      });

      if (rider) {
        rider.rating = this.calculateNewAverage(rider.rating, rating);
        await this.riderRepo.save(rider);
      }
    }

    // Update restaurant rating
    if (order.restaurant) {
      const restaurant = await this.restaurantRepo.findOne({
        where: { restaurant_id: order.restaurant.restaurant_id },
      });

      if (restaurant) {
        restaurant.rating = this.calculateNewAverage(restaurant.rating, rating);
        await this.restaurantRepo.save(restaurant);
      }
    }

    const savedOrder = await this.orderRepo.save(order);

    // Broadcast rating submission
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'orderRated',
      rating,
      feedback,
    });

    return savedOrder;
  }

  // -----------------------------
  // CANCEL ORDER
  // -----------------------------
  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    const order = await this.findOne(orderId);

    // Only allow cancellation for pending or accepted orders
    if (
      order.status !== OrderStatus.Pending &&
      order.status !== OrderStatus.Accepted
    ) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    order.status = OrderStatus.Cancelled;
    if (reason) {
      order.notes = `Cancelled: ${reason}. ${order.notes || ''}`;
    }

    const savedOrder = await this.orderRepo.save(order);

    // Broadcast cancellation
    this.orderGateway.broadcastOrderUpdate({
      orderId,
      type: 'statusUpdate',
      status: OrderStatus.Cancelled,
    });

    return savedOrder;
  }

  // -----------------------------
  // GET ORDERS BY CUSTOMER
  // -----------------------------
  async findByCustomer(customerId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customer: { customer_id: customerId } },
      relations: ['restaurant', 'rider', 'orderItems'],
      order: { created_at: 'DESC' },
    });
  }

  // -----------------------------
  // GET ORDERS BY RESTAURANT
  // -----------------------------
  async findByRestaurant(restaurantId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: { restaurant: { restaurant_id: restaurantId } },
      relations: ['customer', 'rider', 'orderItems'],
      order: { created_at: 'DESC' },
    });
  }

  // -----------------------------
  // GET ORDERS BY RIDER
  // -----------------------------
  async findByRider(riderId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: { rider: { rider_id: riderId } },
      relations: ['customer', 'restaurant', 'orderItems'],
      order: { created_at: 'DESC' },
    });
  }

  // -----------------------------
  // GET PENDING ORDERS FOR RESTAURANT
  // -----------------------------
  async findPendingForRestaurant(restaurantId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        status: OrderStatus.Pending,
      },
      relations: ['customer', 'orderItems'],
      order: { created_at: 'ASC' },
    });
  }

  // -----------------------------
  // GET READY ORDERS FOR RIDERS
  // -----------------------------
  async findReadyOrders(): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        status: OrderStatus.Ready,
        rider: null, // Not yet assigned
      },
      relations: ['restaurant', 'customer', 'orderItems'],
      order: { created_at: 'ASC' },
    });
  }

  // -----------------------------
  // HELPER METHODS
  // -----------------------------
  private calculateNewAverage(
    currentAverage: number | null,
    newRating: number,
  ): number {
    if (!currentAverage) return newRating;

    // Simple moving average - you can adjust this logic
    return Number(((currentAverage + newRating) / 2).toFixed(2));
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStats(restaurantId?: number): Promise<{
    total: number;
    pending: number;
    accepted: number;
    preparing: number;
    delivered: number;
    cancelled: number;
  }> {
    const query = this.orderRepo.createQueryBuilder('order');

    if (restaurantId) {
      query.where('order.restaurant_id = :restaurantId', { restaurantId });
    }

    const orders = await query.getMany();

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === OrderStatus.Pending).length,
      accepted: orders.filter((o) => o.status === OrderStatus.Accepted).length,
      preparing: orders.filter((o) => o.status === OrderStatus.Preparing)
        .length,
      delivered: orders.filter((o) => o.status === OrderStatus.Delivered)
        .length,
      cancelled: orders.filter((o) => o.status === OrderStatus.Cancelled)
        .length,
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(
    restaurantId?: number,
    days: number = 30,
  ): Promise<{
    totalRevenue: number;
    averageOrderValue: number;
    ordersCount: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.orderRepo
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.Delivered })
      .andWhere('order.created_at >= :startDate', { startDate });

    if (restaurantId) {
      query.andWhere('order.restaurant_id = :restaurantId', { restaurantId });
    }

    const orders = await query.getMany();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.total_price,
      0,
    );
    const ordersCount = orders.length;
    const averageOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      ordersCount,
    };
  }
}
