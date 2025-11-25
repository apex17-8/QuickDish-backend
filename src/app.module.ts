import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { OrdersModule } from './orders/orders.module';
import { MenuItemsModule } from './menu_items/menu_items.module';
import { OrderItemsModule } from './order_items/order_items.module';
import { PaymentsModule } from './payments/payments.module';
import { RidersModule } from './riders/riders.module';
import { RiderLocationsModule } from './rider_locations/rider_locations.module';
import { OrderStatusLogsModule } from './order_status_logs/order_status_logs.module';
import { RatingsModule } from './ratings/ratings.module';
import { RestaurantMenuCategoriesModule } from './restaurant-menu_categories/restaurant-menu_categories.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './database/database.config';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsModule } from './websockets/websockets.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    WebsocketsModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    OrdersModule,
    MenuItemsModule,
    OrderItemsModule,
    PaymentsModule,
    RidersModule,
    RiderLocationsModule,
    OrderStatusLogsModule,
    RatingsModule,
    RestaurantMenuCategoriesModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
