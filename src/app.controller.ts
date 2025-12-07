import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('migrate')
  async runMigrations() {
    try {
      const migrations = await this.dataSource.runMigrations();
      return {
        success: true,
        message: 'Migrations completed successfully',
        migrationsRun: migrations.map((m) => m.name),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Migration failed',
        error: error.message,
      };
    }
  }

  @Public()
  @Get('migration-status')
  async getMigrationStatus() {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      const executedMigrations = await this.dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp DESC',
      );

      return {
        success: true,
        pendingMigrations,
        executedMigrations: executedMigrations || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
