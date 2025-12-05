import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThan,
  MoreThan,
  In,
  IsNull,
  Not,
} from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from '../order_items/entities/order_item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Rider } from '../riders/entities/rider.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { MenuItem } from '../menu_items/entities/menu_item.entity';
import { OrderStatusLog } from '../order-status-logs/entities/order-status-log.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    @InjectRepository(Rider)
    private riderRepository: Repository<Rider>,

    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,

    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,

    @InjectRepository(OrderStatusLog)
    private statusLogRepository: Repository<OrderStatusLog>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,

    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== CRUD OPERATIONS ====================

  async createOrderWithItems(createOrderDto: CreateOrderDto): Promise<Order> {
    const { customer_id, restaurant_id, items, ...orderData } = createOrderDto;

    // Validate customer exists
    const customer = await this.customerRepository.findOne({
      where: { customer_id },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customer_id} not found`);
    }

    // Validate restaurant exists
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id },
    });
    if (!restaurant) {
      throw new NotFoundException(
        `Restaurant with ID ${restaurant_id} not found`,
      );
    }

    // Validate all menu items exist and are available
    const menuItemIds = items.map((item) => item.menu_item_id);
    const menuItems = await this.menuItemRepository.find({
      where: { menu_item_id: In(menuItemIds) },
    });

    if (menuItems.length !== items.length) {
      const foundIds = menuItems.map((item) => item.menu_item_id);
      const missingIds = menuItemIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Menu items not found: ${missingIds.join(', ')}`,
      );
    }

    const unavailableItems = menuItems.filter((item) => !item.is_available);
    if (unavailableItems.length > 0) {
      throw new BadRequestException(
        `The following items are not available: ${unavailableItems.map((item) => item.name).join(', ')}`,
      );
    }

    // Create order
    const order = this.orderRepository.create({
      ...orderData,
      customer,
      restaurant,
      status: OrderStatus.Pending,
      payment_status: PaymentStatus.Pending,
      total_price: 0,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    const orderItems = items.map((itemDto) => {
      const menuItem = menuItems.find(
        (mi) => mi.menu_item_id === itemDto.menu_item_id,
      );

      if (!menuItem) {
        throw new NotFoundException(
          `Menu item with ID ${itemDto.menu_item_id} not found`,
        );
      }

      return this.orderItemRepository.create({
        order: savedOrder,
        menu_item: menuItem,
        quantity: itemDto.quantity,
        price_at_purchase: menuItem.price,
        special_instructions: itemDto.special_instructions,
      });
    });

    await this.orderItemRepository.save(orderItems);

    // Calculate and update total
    await this.calculateTotal(savedOrder.order_id);

    // Log status change
    await this.logStatusChange(
      savedOrder.order_id,
      null,
      OrderStatus.Pending,
      'Order created',
      customer.user?.user_id,
    );

    // Emit order created event
    this.eventEmitter.emit('order.created', {
      orderId: savedOrder.order_id,
      customerId: customer.customer_id,
      restaurantId: restaurant.restaurant_id,
      status: OrderStatus.Pending,
      totalPrice: savedOrder.total_price,
    });

    return this.findOrderWithDetails(savedOrder.order_id);
  }

  async createOrderWithPayment(data: any) {
    try {
      // First, create the order
      const order = await this.createOrderWithItems({
        customer_id: data.customer_id,
        restaurant_id: data.restaurant_id,
        delivery_address: data.delivery_address,
        notes: data.notes,
        delivery_latitude: data.delivery_latitude,
        delivery_longitude: data.delivery_longitude,
        items: data.items,
      });

      // Then initialize payment through PaymentsService
      const paymentResult = await this.paymentsService.initializePayment({
        user_id: data.customer_id,
        order_id: order.order_id,
        email: data.email,
        amount: order.total_price,
        callback_url:
          data.callback_url || `${process.env.FRONTEND_URL}/payment/verify`,
      });

      return {
        order,
        payment: paymentResult,
        message: 'Order created and payment initialized successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create order with payment:', error);
      throw new BadRequestException('Failed to create order with payment');
    }
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: [
        'customer.user',
        'restaurant',
        'rider.user',
        'orderItems.menu_item',
      ],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { order_id: id },
      relations: ['customer.user', 'restaurant', 'rider.user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findOrderWithDetails(id: number) {
    const order = await this.orderRepository.findOne({
      where: { order_id: id },
      relations: [
        'customer.user',
        'restaurant',
        'rider.user',
        'orderItems.menu_item',
        'statusLogs',
        'messages.sender',
        'payments',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Add calculated properties
    const orderWithExtras = {
      ...order,
      calculated_total: order.total_price,
      can_be_cancelled: this.canOrderBeCancelled(order),
      can_confirm_delivery: this.canConfirmDelivery(order),
      assignment_expired: this.isAssignmentExpired(order),
      estimated_delivery_time: this.calculateEstimatedDeliveryTime(order),
    };

    return orderWithExtras;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    // Check if order can be updated
    if (!this.canOrderBeUpdated(order)) {
      throw new BadRequestException(
        'Order cannot be updated in its current status',
      );
    }

    Object.assign(order, updateOrderDto);
    const updatedOrder = await this.orderRepository.save(order);

    // Recalculate total if items were modified
    if (updateOrderDto.items) {
      await this.calculateTotal(id);
    }

    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);

    if (
      order.status !== OrderStatus.Cancelled &&
      order.status !== OrderStatus.Pending
    ) {
      throw new BadRequestException(
        'Only pending or cancelled orders can be deleted',
      );
    }

    await this.orderRepository.softDelete(id);
  }

  // ==================== FILTERING & QUERYING ====================

  async findWithFilters(query: OrderQueryDto) {
    const {
      status,
      customer_id,
      restaurant_id,
      rider_id,
      from_date,
      to_date,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (customer_id) where.customer = { customer_id };
    if (restaurant_id) where.restaurant = { restaurant_id };
    if (rider_id) where.rider = { rider_id };
    if (from_date && to_date) {
      where.created_at = Between(new Date(from_date), new Date(to_date));
    } else if (from_date) {
      where.created_at = MoreThan(new Date(from_date));
    } else if (to_date) {
      where.created_at = LessThan(new Date(to_date));
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['customer.user', 'restaurant', 'rider.user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCustomer(customerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customer: { customer_id: customerId } },
      relations: ['restaurant', 'rider.user', 'orderItems.menu_item'],
      order: { created_at: 'DESC' },
    });
  }

  async findByRestaurant(restaurantId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { restaurant: { restaurant_id: restaurantId } },
      relations: ['customer.user', 'rider.user', 'orderItems.menu_item'],
      order: { created_at: 'DESC' },
    });
  }

  async findByRider(riderId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { rider: { rider_id: riderId } },
      relations: ['customer.user', 'restaurant', 'orderItems.menu_item'],
      order: { created_at: 'DESC' },
    });
  }

  async findPendingForRestaurant(restaurantId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        status: In([
          OrderStatus.Pending,
          OrderStatus.Accepted,
          OrderStatus.Preparing,
        ]),
      },
      relations: ['customer.user', 'orderItems.menu_item'],
      order: { created_at: 'ASC' },
    });
  }

  async findReadyOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.Ready,
        rider: IsNull(),
      },
      relations: ['restaurant', 'customer.user'],
      order: { created_at: 'ASC' },
    });
  }

  async findOrdersNeedingAssignment(): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.Ready,
        rider: IsNull(),
        requires_manual_assignment: false,
        assigned_at: IsNull(),
      },
      relations: ['restaurant', 'customer.user'],
      order: { created_at: 'ASC' },
    });
  }

  // ==================== ORDER MANAGEMENT ====================

  async assignRider(orderId: number, riderId: number): Promise<Order> {
    const order = await this.findOne(orderId);
    const rider = await this.riderRepository.findOne({
      where: { rider_id: riderId },
      relations: ['user'],
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    if (!rider.is_online) {
      throw new BadRequestException('Rider is not online');
    }

    if (order.rider && order.rider.rider_id === riderId) {
      throw new BadRequestException('Rider is already assigned to this order');
    }

    const previousStatus = order.status;
    order.rider = rider;
    order.status = OrderStatus.OnRoute;
    order.assigned_at = new Date();
    order.assignment_attempts = 0;

    const updatedOrder = await this.orderRepository.save(order);

    // Log status change
    await this.logStatusChange(
      orderId,
      previousStatus,
      OrderStatus.OnRoute,
      `Rider ${rider.user.name} assigned`,
      rider.user.user_id,
    );

    // Emit events
    this.eventEmitter.emit('order.rider.assigned', {
      orderId,
      riderId,
      riderName: rider.user.name,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('order.delivery.started', {
      orderId,
      riderId,
      startedAt: new Date(),
      estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(updatedOrder),
    });

    return updatedOrder;
  }

  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(orderId);
    const previousStatus = order.status;

    // Validate status transition
    if (!this.isValidStatusTransition(previousStatus, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${previousStatus} to ${status}`,
      );
    }

    order.status = status;

    // Update timestamps based on status
    switch (status) {
      case OrderStatus.Accepted:
        order.accepted_at = new Date();
        break;
      case OrderStatus.Ready:
        order.picked_up_at = new Date();
        break;
      case OrderStatus.Delivered:
        order.picked_up_at = order.picked_up_at || new Date();
        break;
    }

    const updatedOrder = await this.orderRepository.save(order);

    // Log status change
    await this.logStatusChange(
      orderId,
      previousStatus,
      status,
      'Status updated',
      undefined,
    );

    // Emit event
    this.eventEmitter.emit('order.status.updated', {
      orderId,
      status,
      previousStatus,
      timestamp: new Date(),
    });

    // If delivered, emit specific event
    if (status === OrderStatus.Delivered) {
      this.eventEmitter.emit('order.delivered', {
        orderId,
        deliveredAt: new Date(),
        riderId: order.rider?.rider_id,
      });
    }

    return updatedOrder;
  }

  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    const order = await this.findOne(orderId);

    if (!this.canOrderBeCancelled(order)) {
      throw new BadRequestException(
        'Order cannot be cancelled in its current status',
      );
    }

    const previousStatus = order.status;
    order.status = OrderStatus.Cancelled;

    const updatedOrder = await this.orderRepository.save(order);

    // Log status change
    await this.logStatusChange(
      orderId,
      previousStatus,
      OrderStatus.Cancelled,
      `Order cancelled${reason ? `: ${reason}` : ''}`,
      undefined,
    );

    // Emit event
    this.eventEmitter.emit('order.status.updated', {
      orderId,
      status: OrderStatus.Cancelled,
      previousStatus,
      timestamp: new Date(),
    });

    // If payment was made, initiate refund
    if (order.payment_status === PaymentStatus.Paid) {
      await this.initiateRefund(orderId, order.total_price);
    }

    return updatedOrder;
  }

  async submitRating(
    orderId: number,
    rating: number,
    feedback?: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.Delivered) {
      throw new BadRequestException('Only delivered orders can be rated');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    order.customer_rating = rating;
    order.customer_feedback = feedback || null;

    const updatedOrder = await this.orderRepository.save(order);

    // Update restaurant rating
    await this.updateRestaurantRating(order.restaurant.restaurant_id);

    // Update rider rating if assigned
    if (order.rider) {
      await this.updateRiderRating(order.rider.rider_id);
    }

    // Emit event
    this.eventEmitter.emit('order.rated', {
      orderId,
      rating,
      feedback,
      timestamp: new Date(),
    });

    return updatedOrder;
  }

  // ==================== PAYMENT & DELIVERY ====================

  async confirmOrderAfterPayment(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    order.payment_status = PaymentStatus.Paid;
    order.status = OrderStatus.Accepted;
    order.accepted_at = new Date();

    const updatedOrder = await this.orderRepository.save(order);

    // Log status change
    await this.logStatusChange(
      orderId,
      OrderStatus.Pending,
      OrderStatus.Accepted,
      'Payment confirmed',
      undefined,
    );

    // Emit events
    this.eventEmitter.emit('order.status.updated', {
      orderId,
      status: OrderStatus.Accepted,
      previousStatus: OrderStatus.Pending,
      timestamp: new Date(),
    });

    this.eventEmitter.emit('order.payment.completed', {
      orderId,
      amount: order.total_price,
      timestamp: new Date(),
    });

    return updatedOrder;
  }

  async confirmDeliveredByCustomer(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.AwaitingConfirmation) {
      throw new BadRequestException(
        'Order is not awaiting customer confirmation',
      );
    }

    order.customer_confirmed = true;

    // If both customer and rider confirmed, mark as delivered
    if (order.customer_confirmed && order.rider_confirmed) {
      order.status = OrderStatus.Delivered;

      // Log status change
      await this.logStatusChange(
        orderId,
        OrderStatus.AwaitingConfirmation,
        OrderStatus.Delivered,
        'Delivery confirmed by both parties',
        undefined,
      );

      // Emit event
      this.eventEmitter.emit('order.delivered', {
        orderId,
        deliveredAt: new Date(),
        riderId: order.rider?.rider_id,
      });
    }

    return this.orderRepository.save(order);
  }

  async confirmDeliveredByRider(orderId: number): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.AwaitingConfirmation) {
      throw new BadRequestException('Order is not awaiting rider confirmation');
    }

    order.rider_confirmed = true;

    // If both customer and rider confirmed, mark as delivered
    if (order.customer_confirmed && order.rider_confirmed) {
      order.status = OrderStatus.Delivered;

      // Log status change
      await this.logStatusChange(
        orderId,
        OrderStatus.AwaitingConfirmation,
        OrderStatus.Delivered,
        'Delivery confirmed by both parties',
        undefined,
      );

      // Emit event
      this.eventEmitter.emit('order.delivered', {
        orderId,
        deliveredAt: new Date(),
        riderId: order.rider?.rider_id,
      });
    }

    return this.orderRepository.save(order);
  }

  // ==================== STATISTICS & REPORTS ====================

  async getOrderStats(restaurantId?: number) {
    const query = this.orderRepository.createQueryBuilder('order');

    if (restaurantId) {
      query.where('order.restaurant_id = :restaurantId', { restaurantId });
    }

    const total = await query.getCount();
    const pending = await query
      .andWhere('order.status = :status', { status: OrderStatus.Pending })
      .getCount();
    const preparing = await query
      .andWhere('order.status = :status', { status: OrderStatus.Preparing })
      .getCount();
    const delivered = await query
      .andWhere('order.status = :status', { status: OrderStatus.Delivered })
      .getCount();
    const cancelled = await query
      .andWhere('order.status = :status', { status: OrderStatus.Cancelled })
      .getCount();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.orderRepository.count({
      where: {
        created_at: MoreThan(today),
        ...(restaurantId && { restaurant: { restaurant_id: restaurantId } }),
      },
    });

    return {
      total,
      today: todayOrders,
      pending,
      preparing,
      delivered,
      cancelled,
      inProgress: pending + preparing,
    };
  }

  async getRevenueStats(restaurantId?: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.created_at)', 'date')
      .addSelect('SUM(order.total_price)', 'revenue')
      .addSelect('COUNT(order.order_id)', 'orders')
      .where('order.created_at >= :startDate', { startDate })
      .andWhere('order.status = :status', { status: OrderStatus.Delivered })
      .groupBy('DATE(order.created_at)')
      .orderBy('date', 'DESC');

    if (restaurantId) {
      query.andWhere('order.restaurant_id = :restaurantId', { restaurantId });
    }

    const dailyStats = await query.getRawMany();

    // Calculate totals
    const totalRevenue = dailyStats.reduce(
      (sum, day) => sum + parseFloat(day.revenue),
      0,
    );
    const totalOrders = dailyStats.reduce(
      (sum, day) => sum + parseInt(day.orders),
      0,
    );

    return {
      dailyStats,
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }

  async getPaymentStats(restaurantId?: number) {
    const query = this.orderRepository.createQueryBuilder('order');

    if (restaurantId) {
      query.where('order.restaurant_id = :restaurantId', { restaurantId });
    }

    const total = await query.getCount();
    const paid = await query
      .andWhere('order.payment_status = :status', {
        status: PaymentStatus.Paid,
      })
      .getCount();
    const pending = await query
      .andWhere('order.payment_status = :status', {
        status: PaymentStatus.Pending,
      })
      .getCount();
    const failed = await query
      .andWhere('order.payment_status = :status', {
        status: PaymentStatus.Failed,
      })
      .getCount();

    const totalRevenue = await query
      .select('SUM(order.total_price)', 'revenue')
      .andWhere('order.payment_status = :status', {
        status: PaymentStatus.Paid,
      })
      .getRawOne();

    return {
      total,
      paid,
      pending,
      failed,
      paidPercentage: total > 0 ? (paid / total) * 100 : 0,
      totalRevenue: totalRevenue?.revenue || 0,
    };
  }

  // ==================== HELPER METHODS ====================

  async calculateTotal(orderId: number): Promise<number> {
    const orderItems = await this.orderItemRepository.find({
      where: { order: { order_id: orderId } },
      relations: ['menu_item'],
    });

    const total = orderItems.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );

    await this.orderRepository.update(orderId, { total_price: total });
    return total;
  }

  private async logStatusChange(
    orderId: number,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    notes?: string,
    userId?: number,
  ): Promise<void> {
    try {
      const logData: any = {
        order: { order_id: orderId },
        from_status: fromStatus,
        to_status: toStatus,
        notes,
      };

      if (userId) {
        logData.changed_by = { user_id: userId };
        logData.changed_by_role = await this.getUserRole(userId);
      } else {
        logData.changed_by_role = 'system';
      }

      const log = this.statusLogRepository.create(logData);
      await this.statusLogRepository.save(log);
    } catch (error) {
      this.logger.error(
        `Failed to log status change for order ${orderId}:`,
        error,
      );
    }
  }

  private async getUserRole(userId: number): Promise<string> {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
        select: ['role'],
      });
      return user?.role || 'unknown';
    } catch (error) {
      this.logger.error(`Failed to get user role for user ${userId}:`, error);
      return 'unknown';
    }
  }

  private async updateRestaurantRating(restaurantId: number): Promise<void> {
    interface RatingResult {
      average: string | null;
      count: string;
    }

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('AVG(order.customer_rating)', 'average')
      .addSelect('COUNT(order.order_id)', 'count')
      .where('order.restaurant_id = :restaurantId', { restaurantId })
      .andWhere('order.customer_rating IS NOT NULL')
      .getRawOne<RatingResult>();

    if (result && parseInt(result.count) > 0) {
      const averageRating = parseFloat(result.average || '0');
      await this.restaurantRepository.update(restaurantId, {
        rating: averageRating,
      });
    }
  }

  private async updateRiderRating(riderId: number): Promise<void> {
    interface RatingResult {
      average: string | null;
      count: string;
    }

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('AVG(order.customer_rating)', 'average')
      .addSelect('COUNT(order.order_id)', 'count')
      .where('order.rider_id = :riderId', { riderId })
      .andWhere('order.customer_rating IS NOT NULL')
      .getRawOne<RatingResult>();

    if (result && parseInt(result.count) > 0) {
      const averageRating = parseFloat(result.average || '0');
      await this.riderRepository.update(riderId, { rating: averageRating });
    }
  }

  private async initiateRefund(orderId: number, amount: number): Promise<void> {
    try {
      this.logger.log(`Initiating refund for order ${orderId}: ${amount}`);

      // Update payment status
      await this.orderRepository.update(orderId, {
        payment_status: PaymentStatus.Refunded,
      });

      // Log refund
      await this.logStatusChange(
        orderId,
        OrderStatus.Cancelled,
        OrderStatus.Cancelled,
        `Refund initiated: ${amount}`,
        undefined,
      );

      // Emit event
      this.eventEmitter.emit('order.refund.initiated', {
        orderId,
        amount,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to initiate refund for order ${orderId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  // ==================== VALIDATION METHODS ====================

  private canOrderBeCancelled(order: Order): boolean {
    const nonCancellableStatuses = [
      OrderStatus.Delivered,
      OrderStatus.Cancelled,
      OrderStatus.OnRoute,
    ];
    return !nonCancellableStatuses.includes(order.status);
  }

  private canOrderBeUpdated(order: Order): boolean {
    const nonUpdatableStatuses = [
      OrderStatus.Delivered,
      OrderStatus.Cancelled,
      OrderStatus.OnRoute,
    ];
    return !nonUpdatableStatuses.includes(order.status);
  }

  private canConfirmDelivery(order: Order): boolean {
    return order.status === OrderStatus.AwaitingConfirmation;
  }

  private isAssignmentExpired(order: Order): boolean {
    if (!order.assigned_at) return false;

    const assignmentTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
    const timeSinceAssignment =
      Date.now() - new Date(order.assigned_at).getTime();

    return timeSinceAssignment > assignmentTimeout;
  }

  private isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.Pending]: [OrderStatus.Accepted, OrderStatus.Cancelled],
      [OrderStatus.Accepted]: [OrderStatus.Preparing, OrderStatus.Cancelled],
      [OrderStatus.Preparing]: [OrderStatus.Ready, OrderStatus.Cancelled],
      [OrderStatus.Ready]: [OrderStatus.OnRoute, OrderStatus.Cancelled],
      [OrderStatus.OnRoute]: [OrderStatus.AwaitingConfirmation],
      [OrderStatus.AwaitingConfirmation]: [OrderStatus.Delivered],
      [OrderStatus.Delivered]: [],
      [OrderStatus.Cancelled]: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private calculateEstimatedDeliveryTime(order: Order): Date | null {
    if (!order.created_at) return null;

    const baseTime = new Date(order.created_at);

    // Add estimated times based on status
    switch (order.status) {
      case OrderStatus.Pending:
        baseTime.setMinutes(baseTime.getMinutes() + 5); // 5 minutes for acceptance
        break;
      case OrderStatus.Accepted:
        baseTime.setMinutes(baseTime.getMinutes() + 20); // 20 minutes for preparation
        break;
      case OrderStatus.Preparing:
        baseTime.setMinutes(baseTime.getMinutes() + 15); // 15 minutes remaining
        break;
      case OrderStatus.Ready:
        baseTime.setMinutes(baseTime.getMinutes() + 30); // 30 minutes for delivery
        break;
      case OrderStatus.OnRoute:
        baseTime.setMinutes(baseTime.getMinutes() + 15); // 15 minutes remaining
        break;
      default:
        return null;
    }

    return baseTime;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateStatus(
    orderIds: number[],
    status: OrderStatus,
  ): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { order_id: In(orderIds) },
    });

    const updatedOrders: Order[] = [];

    for (const order of orders) {
      try {
        const updatedOrder = await this.updateStatus(order.order_id, status);
        updatedOrders.push(updatedOrder);
      } catch (error) {
        this.logger.error(`Failed to update order ${order.order_id}:`, error);
      }
    }

    return updatedOrders;
  }

  async bulkAssignRider(orderIds: number[], riderId: number): Promise<Order[]> {
    const rider = await this.riderRepository.findOne({
      where: { rider_id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    if (!rider.is_online) {
      throw new BadRequestException('Rider is not online');
    }

    const orders = await this.orderRepository.find({
      where: {
        order_id: In(orderIds),
        status: OrderStatus.Ready,
        rider: IsNull(),
      },
    });

    const updatedOrders: Order[] = [];

    for (const order of orders) {
      try {
        const updatedOrder = await this.assignRider(order.order_id, riderId);
        updatedOrders.push(updatedOrder);
      } catch (error) {
        this.logger.error(
          `Failed to assign rider to order ${order.order_id}:`,
          error,
        );
      }
    }

    return updatedOrders;
  }

  // ==================== SEARCH ====================

  async searchOrders(query: string, filters?: any): Promise<Order[]> {
    const searchQuery = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.rider', 'rider')
      .where('order.order_id = :id', { id: parseInt(query) || 0 })
      .orWhere('user.name LIKE :name', { name: `%${query}%` })
      .orWhere('user.email LIKE :email', { email: `%${query}%` })
      .orWhere('user.phone LIKE :phone', { phone: `%${query}%` })
      .orWhere('restaurant.name LIKE :restaurant', { restaurant: `%${query}%` })
      .orderBy('order.created_at', 'DESC')
      .take(50);

    if (filters?.status) {
      searchQuery.andWhere('order.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.fromDate) {
      searchQuery.andWhere('order.created_at >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters?.toDate) {
      searchQuery.andWhere('order.created_at <= :toDate', {
        toDate: filters.toDate,
      });
    }

    return searchQuery.getMany();
  }

  // ==================== EXPORT ====================

  async exportOrders(filters: OrderQueryDto): Promise<any> {
    const orders = await this.findWithFilters(filters);

    // Format data for export
    const exportData = orders.orders.map((order) => ({
      'Order ID': order.order_id,
      Customer: order.customer.user?.name || 'N/A',
      Restaurant: order.restaurant.name,
      Status: order.status,
      Total: order.total_price,
      'Payment Status': order.payment_status,
      'Delivery Address': order.delivery_address,
      'Created At': order.created_at,
      'Updated At': order.updated_at,
    }));

    return {
      data: exportData,
      metadata: {
        total: orders.total,
        generatedAt: new Date(),
        filters,
      },
    };
  }

  // ==================== CLEANUP ====================

  async cleanupOldOrders(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.orderRepository
      .createQueryBuilder()
      .softDelete()
      .where('status = :status', { status: OrderStatus.Delivered })
      .andWhere('created_at < :cutoff', { cutoff: cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // ==================== DELIVERY ESTIMATION ====================

  async getDeliveryEstimation(orderId: number) {
    const order = await this.findOne(orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const estimatedTime = this.calculateEstimatedDeliveryTime(order);

    return {
      orderId,
      status: order.status,
      estimatedDeliveryTime: estimatedTime,
      currentLocation: order.rider
        ? {
            riderId: order.rider.rider_id,
            riderName: order.rider.user?.name,
            latitude: order.rider.currentLatitude,
            longitude: order.rider.currentLongitude,
          }
        : null,
      restaurantLocation: {
        name: order.restaurant.name,
        address: order.restaurant.address,
      },
      deliveryAddress: order.delivery_address,
    };
  }

  // ==================== ADMIN METHODS ====================

  async getAdminDashboardStats() {
    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      activeRiders,
      totalRevenue,
      topRestaurants,
    ] = await Promise.all([
      this.orderRepository.count(),
      this.orderRepository.count({
        where: {
          created_at: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
        },
      }),
      this.orderRepository.count({
        where: {
          status: In([
            OrderStatus.Pending,
            OrderStatus.Accepted,
            OrderStatus.Preparing,
          ]),
        },
      }),
      this.riderRepository.count({ where: { is_online: true } }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total_price)', 'revenue')
        .where('order.status = :status', { status: OrderStatus.Delivered })
        .andWhere('order.payment_status = :paymentStatus', {
          paymentStatus: PaymentStatus.Paid,
        })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('restaurant.name', 'name')
        .addSelect('COUNT(order.order_id)', 'orderCount')
        .addSelect('SUM(order.total_price)', 'revenue')
        .leftJoin('order.restaurant', 'restaurant')
        .where('order.created_at >= :date', {
          date: new Date(new Date().setDate(new Date().getDate() - 7)),
        })
        .groupBy('restaurant.restaurant_id, restaurant.name')
        .orderBy('orderCount', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    return {
      overview: {
        totalOrders,
        todayOrders,
        pendingOrders,
        activeRiders,
        totalRevenue: totalRevenue?.revenue || 0,
      },
      topRestaurants,
      recentActivity: await this.getRecentActivity(),
    };
  }

  private async getRecentActivity() {
    return this.orderRepository.find({
      relations: ['customer.user', 'restaurant', 'rider.user'],
      order: { created_at: 'DESC' },
      take: 10,
    });
  }
}
