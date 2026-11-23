import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { TripsModule } from '../trips/trips.module';
import { JobsController } from './jobs.controller';

@Module({ imports: [BookingsModule, TripsModule], controllers: [JobsController] })
export class JobsModule {}
