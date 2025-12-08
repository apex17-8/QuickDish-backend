import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { OrdersModule } from './orders/orders.module';
import { MenuItemsModule } from './menu_items/menu_items.module';
import { OrderItemsModule } from './order_items/order_items.module';
import { PaymentsModule } from './payments/payments.module';
import { RidersModule } from './riders/riders.module';
import { RiderLocationsModule } from './rider_locations/rider_locations.module';
import { OrderStatusLogsModule } from './order-status-logs/order_status_logs.module';
import { RestaurantMenuCategoriesModule } from './restaurant-menu_categories/restaurant-menu_categories.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { databaseConfig } from './database/database.config';
import { RiderRequestsModule } from './rider-request/rider-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    RestaurantsModule,
    OrdersModule,
    MenuItemsModule,
    OrderItemsModule,
    PaymentsModule,
    RidersModule,
    RiderLocationsModule,
    OrderStatusLogsModule,
    RestaurantMenuCategoriesModule,
    WebsocketsModule,
    RiderRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
