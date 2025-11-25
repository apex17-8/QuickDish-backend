import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RiderLocationService } from 'src/rider_locations/rider_locations.service';
import { RiderLocationUpdateDto } from '../dto/rider-location-update.dto';

interface LiveRiderLocation {
  lat: number;
  lng: number;
  address: string | null;
  timestamp: string;
  socketId: string;
}

@WebSocketGateway({ cors: true, namespace: '/rider-tracking' })
export class RiderTrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // In-memory storage for live rider locations
  private readonly liveRiderLocations = new Map<number, LiveRiderLocation>();

  constructor(private readonly locationService: RiderLocationService) {}

  afterInit(server: Server) {
    // Clean up old locations every 5 minutes
    setInterval(() => this.cleanupOldLocations(), 5 * 60 * 1000);
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove rider location when client disconnects
    this.removeRiderLocationBySocketId(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Rider updates their location
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @MessageBody() payload: { riderId: number } & RiderLocationUpdateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { riderId, latitude, longitude, address } = payload;

    try {
      // Save to database (history)
      const saved = await this.locationService.updateLocation(riderId, {
        latitude,
        longitude,
        address,
      });

      // Update in-memory storage
      const liveLocation: LiveRiderLocation = {
        lat: latitude,
        lng: longitude,
        address: address ?? null,
        timestamp: new Date().toISOString(),
        socketId: client.id,
      };

      this.liveRiderLocations.set(riderId, liveLocation);

      // Broadcast to room for order tracking and restaurant/customer listeners
      this.server.to(`rider:${riderId}`).emit('riderLocation', {
        riderId,
        latitude,
        longitude,
        address,
        timestamp: saved.timestamp,
      });

      // Also emit to order rooms that might be tracking this rider
      this.server.emit('riderLocationGlobal', {
        riderId,
        latitude,
        longitude,
        address,
        timestamp: saved.timestamp,
      });

      return { ok: true, message: 'Location updated' };
    } catch (error) {
      console.error('Error updating location:', error);
      return { ok: false, error: 'Failed to update location' };
    }
  }

  /**
   * Get current live location for a rider
   */
  @SubscribeMessage('getLiveLocation')
  handleGetLiveLocation(@MessageBody() payload: { riderId: number }) {
    const liveLocation = this.liveRiderLocations.get(payload.riderId);

    if (liveLocation) {
      return {
        ok: true,
        location: {
          riderId: payload.riderId,
          latitude: liveLocation.lat,
          longitude: liveLocation.lng,
          address: liveLocation.address,
          timestamp: liveLocation.timestamp,
        },
      };
    }

    return { ok: false, message: 'No live location available' };
  }

  /**
   * Get all active riders with their live locations
   */
  @SubscribeMessage('getActiveRiders')
  handleGetActiveRiders() {
    const activeRiders = Array.from(this.liveRiderLocations.entries()).map(
      ([riderId, location]) => ({
        riderId,
        latitude: location.lat,
        longitude: location.lng,
        address: location.address,
        timestamp: location.timestamp,
      }),
    );

    return { ok: true, riders: activeRiders };
  }

  /**
   * Clients (customers/restaurants) can subscribe to a rider's location updates
   */
  @SubscribeMessage('subscribeRider')
  async handleSubscribeRider(
    @MessageBody() payload: { riderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`rider:${payload.riderId}`);

    // Send current location immediately upon subscription
    const liveLocation = this.liveRiderLocations.get(payload.riderId);
    if (liveLocation) {
      client.emit('riderLocation', {
        riderId: payload.riderId,
        latitude: liveLocation.lat,
        longitude: liveLocation.lng,
        address: liveLocation.address,
        timestamp: liveLocation.timestamp,
      });
    }

    return { ok: true, joined: `rider:${payload.riderId}` };
  }

  @SubscribeMessage('unsubscribeRider')
  async handleUnsubscribeRider(
    @MessageBody() payload: { riderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`rider:${payload.riderId}`);
    return { ok: true, left: `rider:${payload.riderId}` };
  }

  /**
   * Subscribe to multiple riders at once (for order tracking)
   */
  @SubscribeMessage('subscribeRiders')
  handleSubscribeRiders(
    @MessageBody() payload: { riderIds: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    payload.riderIds.forEach((riderId) => {
    client.join(`rider:${riderId}`);

      // Send current location for each rider
      const liveLocation = this.liveRiderLocations.get(riderId);
      if (liveLocation) {
        client.emit('riderLocation', {
          riderId,
          latitude: liveLocation.lat,
          longitude: liveLocation.lng,
          address: liveLocation.address,
          timestamp: liveLocation.timestamp,
        });
      }
    });

    return { ok: true, subscribedTo: payload.riderIds };
  }

  /**
   * Clean up locations older than 10 minutes
   */
  private cleanupOldLocations() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    let cleanedCount = 0;

    for (const [riderId, location] of this.liveRiderLocations.entries()) {
      const locationTime = new Date(location.timestamp);
      if (locationTime < tenMinutesAgo) {
        this.liveRiderLocations.delete(riderId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old rider locations`);
    }
  }

  /**
   * Remove rider location by socket ID (when client disconnects)
   */
  private removeRiderLocationBySocketId(socketId: string) {
    for (const [riderId, location] of this.liveRiderLocations.entries()) {
      if (location.socketId === socketId) {
        this.liveRiderLocations.delete(riderId);
        console.log(`Removed location for rider ${riderId} due to disconnect`);
        break;
      }
    }
  }

  /**
   * Public method to get live location (can be used by other services)
   */
  getLiveLocation(riderId: number): LiveRiderLocation | null {
    return this.liveRiderLocations.get(riderId) || null;
  }

  /**
   * Public method to get all active riders
   */
  getAllActiveRiders(): Map<number, LiveRiderLocation> {
    return new Map(this.liveRiderLocations);
  }
}
