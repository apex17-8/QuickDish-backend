// src/order-status-logs/order_status_logs.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { OrderStatusLog } from './entities/order-status-log.entity';
import { CreateOrderStatusLogDto } from './dto/create-order_status_log.dto';
import { UpdateOrderStatusLogDto } from './dto/update-order_status_log.dto';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class OrderStatusLogsService {
  constructor(
    @InjectRepository(OrderStatusLog)
    private readonly logRepo: Repository<OrderStatusLog>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** CREATE LOG */
  async create(dto: CreateOrderStatusLogDto): Promise<OrderStatusLog> {
    // Validate order exists
    const order = await this.orderRepo.findOne({
      where: { order_id: dto.order_id },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.order_id} not found`);
    }

    // Validate user exists if user_id is provided
    let user: User | null = null;
    if (dto.changed_by_user_id) {
      user = await this.userRepo.findOne({
        where: { user_id: dto.changed_by_user_id },
      });
      if (!user) {
        throw new NotFoundException(`User ${dto.changed_by_user_id} not found`);
      }
    }

    // Validate status transition if both statuses are provided
    if (dto.from_status && dto.to_status) {
      this.validateStatusTransition(dto.from_status, dto.to_status);
    }

    // Ensure changed_by_role is not null - default to 'system' if not provided
    const changedByRole = dto.changed_by_role || (user ? user.role : 'system');

    // FIXED: Create log using proper object structure
    const log = this.logRepo.create({
      order: { order_id: dto.order_id } as any,
      from_status: dto.from_status || null,
      to_status: dto.to_status,
      changed_by: user ? ({ user_id: user.user_id } as any) : null,
      changed_by_role: changedByRole,
      notes: dto.notes || undefined,
    });

    return await this.logRepo.save(log);
  }

  /** GET ALL */
  async findAll(): Promise<OrderStatusLog[]> {
    return this.logRepo.find({
      relations: ['order', 'changed_by'],
      order: { changed_at: 'DESC' },
    });
  }

  /** GET ONE */
  async findOne(id: number): Promise<OrderStatusLog> {
    const log = await this.logRepo.findOne({
      where: { id },
      relations: ['order', 'changed_by'],
    });

    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }

    return log;
  }

  /** UPDATE */
  async update(
    id: number,
    dto: UpdateOrderStatusLogDto,
  ): Promise<OrderStatusLog> {
    const log = await this.findOne(id);

    // Validate status transition if updating both statuses
    if (dto.from_status && dto.to_status) {
      this.validateStatusTransition(dto.from_status, dto.to_status);
    }

    // Update only provided fields
    if (dto.from_status !== undefined) log.from_status = dto.from_status;
    if (dto.to_status !== undefined) log.to_status = dto.to_status;
    if (dto.changed_by_role !== undefined)
      log.changed_by_role = dto.changed_by_role;
    if (dto.notes !== undefined) log.notes = dto.notes;

    return this.logRepo.save(log);
  }

  /** DELETE */
  async remove(id: number): Promise<void> {
    const log = await this.findOne(id);
    await this.logRepo.remove(log);
  }

  /** GET LOGS BY ORDER ID */
  async findByOrderId(orderId: number): Promise<OrderStatusLog[]> {
    // Verify order exists
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.logRepo.find({
      where: { order: { order_id: orderId } },
      relations: ['changed_by'],
      order: { changed_at: 'DESC' },
    });
  }

  /** GET LATEST LOG FOR ORDER */
  async findLatestByOrderId(orderId: number): Promise<OrderStatusLog | null> {
    const logs = await this.logRepo.find({
      where: { order: { order_id: orderId } },
      order: { changed_at: 'DESC' },
      take: 1,
      relations: ['changed_by'],
    });

    return logs.length > 0 ? logs[0] : null;
  }

  /** GET LOGS BY USER ID */
  async findByUserId(userId: number): Promise<OrderStatusLog[]> {
    // Verify user exists
    const user = await this.userRepo.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.logRepo.find({
      where: { changed_by: { user_id: userId } },
      relations: ['order'],
      order: { changed_at: 'DESC' },
    });
  }

  /** GET LOGS BY STATUS */
  async findByStatus(status: OrderStatus): Promise<OrderStatusLog[]> {
    return this.logRepo.find({
      where: { to_status: status },
      relations: ['order', 'changed_by'],
      order: { changed_at: 'DESC' },
    });
  }

  /** GET LOGS WITHIN DATE RANGE */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<OrderStatusLog[]> {
    return this.logRepo.find({
      where: {
        changed_at: Between(startDate, endDate),
      },
      relations: ['order', 'changed_by'],
      order: { changed_at: 'DESC' },
    });
  }

  /** VALIDATE STATUS TRANSITION */
  private validateStatusTransition(
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
  ): void {
    // Basic validation - you can expand this with business logic
    if (fromStatus === toStatus) {
      throw new BadRequestException(
        `Status cannot be changed to the same status: ${fromStatus}`,
      );
    }

    // Add more business rules as needed
    if (
      fromStatus === OrderStatus.Delivered &&
      toStatus === OrderStatus.Pending
    ) {
      throw new BadRequestException(
        'Cannot revert delivered order to pending status',
      );
    }

    if (
      fromStatus === OrderStatus.Ready &&
      toStatus === OrderStatus.Preparing
    ) {
      throw new BadRequestException(
        'Cannot revert ready order to preparing status',
      );
    }
  }

  /** BULK DELETE OLD LOGS */
  async cleanupOldLogs(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.logRepo
      .createQueryBuilder()
      .delete()
      .where('changed_at < :cutoff', { cutoff: cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /** GET STATISTICS */
  async getStatistics(): Promise<{
    totalLogs: number;
    logsToday: number;
    byStatus: Record<string, number>;
    byUser: Array<{ userId: number; count: number }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, logsToday, byStatus, byUser] = await Promise.all([
      this.logRepo.count(),
      this.logRepo.count({
        where: {
          changed_at: MoreThanOrEqual(today),
        },
      }),
      this.logRepo
        .createQueryBuilder('log')
        .select('log.to_status', 'status')
        .addSelect('COUNT(log.id)', 'count')
        .groupBy('log.to_status')
        .getRawMany(),
      this.logRepo
        .createQueryBuilder('log')
        .select('log.changed_by_user_id', 'userId')
        .addSelect('COUNT(log.id)', 'count')
        .where('log.changed_by_user_id IS NOT NULL')
        .groupBy('log.changed_by_user_id')
        .orderBy('count', 'DESC')
        .getRawMany(),
    ]);

    // Format byStatus into a proper object
    const statusCounts: Record<string, number> = {};
    byStatus.forEach((item) => {
      statusCounts[item.status] = parseInt(item.count);
    });

    return {
      totalLogs,
      logsToday,
      byStatus: statusCounts,
      byUser: byUser.map((item) => ({
        userId: parseInt(item.userId),
        count: parseInt(item.count),
      })),
    };
  }
}
