import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({ imports: [ReviewsModule], controllers: [TripsController], providers: [TripsService], exports: [TripsService] })
export class TripsModule {}
