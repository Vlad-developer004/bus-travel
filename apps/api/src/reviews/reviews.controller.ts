import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { CreateReviewDto, ListReviewsDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  list(@Query() q: ListReviewsDto) {
    return this.reviews.list(q.from, q.to, q.limit);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user, dto);
  }
}
