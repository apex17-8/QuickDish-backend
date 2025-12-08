// src/rider-requests/rider-requests.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RiderRequest,
  RiderRequestStatus,
} from './entities/rider-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateRiderRequestDto } from './dto/create-rider-request.dto';
import {
  RestaurantStaff,
  StaffRole,
} from '../restaurant_staff/entities/restaurant_staff.entity';

@Injectable()
export class RiderRequestsService {
  private readonly logger = new Logger(RiderRequestsService.name);

  constructor(
    @InjectRepository(RiderRequest)
    private readonly riderRequestRepository: Repository<RiderRequest>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,

    @InjectRepository(RestaurantStaff)
    private readonly staffRepository: Repository<RestaurantStaff>,

    private eventEmitter: EventEmitter2,
  ) {}

  // Create a new rider request
  async createRequest(
    createDto: CreateRiderRequestDto,
    userId: number,
  ): Promise<RiderRequest> {
    // Check if rider exists and is actually a rider
    const rider = await this.userRepository.findOne({
      where: { user_id: createDto.rider_id, role: UserRole.Rider },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found or user is not a rider');
    }

    // Check if restaurant exists
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: createDto.restaurant_id },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check if request already exists
    const existingRequest = await this.riderRequestRepository.findOne({
      where: {
        rider: { user_id: createDto.rider_id },
        restaurant: { restaurant_id: createDto.restaurant_id },
        status: RiderRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'A pending request already exists for this rider and restaurant',
      );
    }

    // Create the request
    const request = this.riderRequestRepository.create({
      rider: { user_id: createDto.rider_id } as User,
      restaurant: { restaurant_id: createDto.restaurant_id } as Restaurant,
      message: createDto.message,
      status: RiderRequestStatus.PENDING,
    });

    const savedRequest = await this.riderRequestRepository.save(request);

    // Emit event
    this.eventEmitter.emit('rider.request.created', {
      requestId: savedRequest.request_id,
      riderId: createDto.rider_id,
      restaurantId: createDto.restaurant_id,
      restaurantName: restaurant.name,
      riderName: rider.name,
    });

    this.logger.log(`Rider request created: ${savedRequest.request_id}`);
    return savedRequest;
  }

  // Get all requests for a restaurant (with owner/manager check)
  async getRestaurantRequests(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<RiderRequest[]> {
    // Verify user has access to this restaurant
    await this.verifyRestaurantAccess(restaurantId, userId, userRole);

    return this.riderRequestRepository.find({
      where: { restaurant: { restaurant_id: restaurantId } },
      relations: ['rider', 'restaurant', 'reviewed_by'],
      order: { created_at: 'DESC' },
    });
  }

  // Get pending requests for a restaurant
  async getPendingRequests(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<RiderRequest[]> {
    await this.verifyRestaurantAccess(restaurantId, userId, userRole);

    return this.riderRequestRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        status: RiderRequestStatus.PENDING,
      },
      relations: ['rider', 'restaurant'],
      order: { created_at: 'DESC' },
    });
  }

  // Get a single request
  async findOne(requestId: number): Promise<RiderRequest> {
    const request = await this.riderRequestRepository.findOne({
      where: { request_id: requestId },
      relations: ['rider', 'restaurant', 'reviewed_by'],
    });

    if (!request) {
      throw new NotFoundException(`Rider request ${requestId} not found`);
    }

    return request;
  }

  // Update request status (approve/reject/suspend)
  async updateRequestStatus(
    requestId: number,
    status: RiderRequestStatus,
    userId: number,
    userRole: string,
    reason?: string,
  ): Promise<RiderRequest> {
    const request = await this.findOne(requestId);

    // Verify user has access to this restaurant
    await this.verifyRestaurantAccess(
      request.restaurant.restaurant_id,
      userId,
      userRole,
    );

    // Check if status transition is valid
    if (!this.isValidStatusTransition(request.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${request.status} to ${status}`,
      );
    }

    const previousStatus = request.status;
    request.status = status;
    request.reviewed_by = { user_id: userId } as User;

    // Update timestamps and reasons based on status
    switch (status) {
      case RiderRequestStatus.APPROVED:
        request.approved_at = new Date();
        request.rejection_reason = '';
        request.suspension_reason = '';
        break;
      case RiderRequestStatus.REJECTED:
        request.rejected_at = new Date();
        request.rejection_reason = reason || 'Rejected by restaurant';
        break;
      case RiderRequestStatus.SUSPENDED:
        request.suspended_at = new Date();
        request.suspension_reason = reason || 'Suspended by restaurant';
        break;
    }

    const updatedRequest = await this.riderRequestRepository.save(request);

    // If approved, add rider to restaurant staff
    if (status === RiderRequestStatus.APPROVED) {
      await this.addRiderToRestaurant(
        request.rider.user_id,
        request.restaurant.restaurant_id,
        userId,
      );
    }

    // Emit event
    this.eventEmitter.emit('rider.request.updated', {
      requestId,
      riderId: request.rider.user_id,
      restaurantId: request.restaurant.restaurant_id,
      previousStatus,
      newStatus: status,
      reviewedBy: userId,
      reason,
    });

    this.logger.log(`Rider request ${requestId} updated to ${status}`);
    return updatedRequest;
  }

  // Approve rider request
  async approveRequest(
    requestId: number,
    userId: number,
    userRole: string,
  ): Promise<RiderRequest> {
    return this.updateRequestStatus(
      requestId,
      RiderRequestStatus.APPROVED,
      userId,
      userRole,
    );
  }

  // Reject rider request
  async rejectRequest(
    requestId: number,
    userId: number,
    userRole: string,
    reason?: string,
  ): Promise<RiderRequest> {
    return this.updateRequestStatus(
      requestId,
      RiderRequestStatus.REJECTED,
      userId,
      userRole,
      reason,
    );
  }

  // Suspend rider
  async suspendRider(
    requestId: number,
    userId: number,
    userRole: string,
    reason?: string,
  ): Promise<RiderRequest> {
    return this.updateRequestStatus(
      requestId,
      RiderRequestStatus.SUSPENDED,
      userId,
      userRole,
      reason,
    );
  }

  // Get rider statistics for a restaurant
  async getRiderStats(restaurantId: number, userId: number, userRole: string) {
    await this.verifyRestaurantAccess(restaurantId, userId, userRole);

    const requests = await this.riderRequestRepository.find({
      where: { restaurant: { restaurant_id: restaurantId } },
    });

    const stats = {
      total: requests.length,
      pending: requests.filter((r) => r.status === RiderRequestStatus.PENDING)
        .length,
      approved: requests.filter((r) => r.status === RiderRequestStatus.APPROVED)
        .length,
      rejected: requests.filter((r) => r.status === RiderRequestStatus.REJECTED)
        .length,
      suspended: requests.filter(
        (r) => r.status === RiderRequestStatus.SUSPENDED,
      ).length,
    };

    return stats;
  }

  // Get all approved riders for a restaurant
  async getApprovedRiders(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<any[]> {
    await this.verifyRestaurantAccess(restaurantId, userId, userRole);

    const approvedRequests = await this.riderRequestRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        status: RiderRequestStatus.APPROVED,
      },
      relations: ['rider', 'reviewed_by'],
    });

    // Also get riders from restaurant staff
    const staffRiders = await this.staffRepository.find({
      where: {
        restaurant: { restaurant_id: restaurantId },
        role: StaffRole.Rider,
      },
      relations: ['user'],
    });

    // Combine both sources
    const riders = approvedRequests.map((request) => ({
      id: request.rider.user_id,
      name: request.rider.name,
      email: request.rider.email,
      phone: request.rider.phone,
      approved_at: request.approved_at,
      approved_by: request.reviewed_by?.name,
      is_active: true,
    }));

    // Add staff riders not already in the list
    staffRiders.forEach((staff) => {
      if (!riders.find((r) => r.id === staff.user.user_id)) {
        riders.push({
          id: staff.user.user_id,
          name: staff.user.name,
          email: staff.user.email,
          phone: staff.user.phone,
          approved_at: staff.assigned_at,
          approved_by: 'Staff Assignment',
          is_active: true,
        });
      }
    });

    return riders;
  }

  // Get available riders (not yet approved for this restaurant)
  async getAvailableRiders(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<any[]> {
    await this.verifyRestaurantAccess(restaurantId, userId, userRole);

    // Get all riders
    const allRiders = await this.userRepository.find({
      where: { role: UserRole.Rider },
      select: ['user_id', 'name', 'email', 'phone', 'profile_picture'],
    });

    // Get riders already approved or pending for this restaurant
    const existingRequests = await this.riderRequestRepository.find({
      where: { restaurant: { restaurant_id: restaurantId } },
      relations: ['rider'],
    });

    const existingRiderIds = existingRequests.map((r) => r.rider.user_id);

    // Filter out existing riders
    const availableRiders = allRiders.filter(
      (rider) => !existingRiderIds.includes(rider.user_id),
    );

    return availableRiders;
  }

  // Remove rider from restaurant (soft delete)
  async removeRider(
    requestId: number,
    userId: number,
    userRole: string,
    reason?: string,
  ): Promise<void> {
    const request = await this.findOne(requestId);
    await this.verifyRestaurantAccess(
      request.restaurant.restaurant_id,
      userId,
      userRole,
    );

    // Remove rider from restaurant staff
    await this.removeRiderFromRestaurant(
      request.rider.user_id,
      request.restaurant.restaurant_id,
    );

    // Update request status to rejected
    request.status = RiderRequestStatus.REJECTED;
    request.rejection_reason = reason || 'Removed by restaurant';
    request.rejected_at = new Date();
    request.reviewed_by = { user_id: userId } as User;

    await this.riderRequestRepository.save(request);

    this.eventEmitter.emit('rider.removed', {
      requestId,
      riderId: request.rider.user_id,
      restaurantId: request.restaurant.restaurant_id,
      removedBy: userId,
      reason,
    });
  }

  // Private helper methods
  private async verifyRestaurantAccess(
    restaurantId: number,
    userId: number,
    userRole: string,
  ): Promise<void> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { restaurant_id: restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Super admin can access any restaurant
    if (userRole === UserRole.SuperAdmin) {
      return;
    }

    // Restaurant owner can access their own restaurant
    if (
      userRole === UserRole.RestaurantOwner &&
      restaurant.owner.user_id === userId
    ) {
      return;
    }

    // Manager can access if assigned to this restaurant
    if (userRole === UserRole.Manager) {
      const staffAssignment = await this.staffRepository.findOne({
        where: {
          user: { user_id: userId },
          restaurant: { restaurant_id: restaurantId },
          role: StaffRole.Manager,
        },
      });

      if (staffAssignment) {
        return;
      }
    }

    throw new ForbiddenException(
      'You do not have permission to access this restaurant',
    );
  }

  private async addRiderToRestaurant(
    riderId: number,
    restaurantId: number,
    assignedBy: number,
  ): Promise<void> {
    // Check if rider is already assigned
    const existingStaff = await this.staffRepository.findOne({
      where: {
        user: { user_id: riderId },
        restaurant: { restaurant_id: restaurantId },
        role: StaffRole.Rider,
      },
    });

    if (existingStaff) {
      return; // Already assigned
    }

    // Create new staff assignment
    const staff = this.staffRepository.create({
      user: { user_id: riderId } as User,
      restaurant: { restaurant_id: restaurantId } as Restaurant,
      role: StaffRole.Rider,
      createdBy: { user_id: assignedBy } as User,
    });

    await this.staffRepository.save(staff);
  }

  private async removeRiderFromRestaurant(
    riderId: number,
    restaurantId: number,
  ): Promise<void> {
    await this.staffRepository.delete({
      user: { user_id: riderId },
      restaurant: { restaurant_id: restaurantId },
      role: StaffRole.Rider,
    });
  }

  private isValidStatusTransition(
    from: RiderRequestStatus,
    to: RiderRequestStatus,
  ): boolean {
    const validTransitions: Record<RiderRequestStatus, RiderRequestStatus[]> = {
      [RiderRequestStatus.PENDING]: [
        RiderRequestStatus.APPROVED,
        RiderRequestStatus.REJECTED,
      ],
      [RiderRequestStatus.APPROVED]: [RiderRequestStatus.SUSPENDED],
      [RiderRequestStatus.REJECTED]: [], // Cannot change from rejected
      [RiderRequestStatus.SUSPENDED]: [
        RiderRequestStatus.APPROVED,
        RiderRequestStatus.REJECTED,
      ],
    };

    return validTransitions[from]?.includes(to) || false;
  }
}
