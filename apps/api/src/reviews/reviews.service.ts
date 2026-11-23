import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './reviews.dto';

export interface Rating {
  average: number;
  count: number;
}

export function displayName(name: string | null, email: string) {
  const parts = (name?.trim() || email.split('@')[0]).split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'Guest';
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + '.' : '';
  return (first[0].toUpperCase() + first.slice(1) + ' ' + last).trim();
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private pairRouteIds(from: string, to: string) {
    return this.prisma.route
      .findMany({
        where: { OR: [{ from: { slug: from }, to: { slug: to } }, { from: { slug: to }, to: { slug: from } }] },
        select: { id: true },
      })
      .then((r) => r.map((x) => x.id));
  }

  async rating(from: string, to: string): Promise<Rating | null> {
    const ids = await this.pairRouteIds(from, to);
    if (!ids.length) return null;
    const agg = await this.prisma.review.aggregate({ where: { routeId: { in: ids } }, _avg: { rating: true }, _count: true });
    return agg._count ? { average: Math.round((agg._avg.rating ?? 0) * 10) / 10, count: agg._count } : null;
  }

  async list(from: string, to: string, limit = 20) {
    const ids = await this.pairRouteIds(from, to);
    const where = { routeId: { in: ids } };
    const [agg, groups, items] = await Promise.all([
      this.prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: true }),
      this.prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    ]);
    const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: groups.find((g) => g.rating === star)?._count ?? 0 }));
    return {
      average: agg._count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0,
      count: agg._count,
      distribution,
      items: items.map((r) => ({
        id: r.id,
        author: r.authorName,
        rating: r.rating,
        comment: r.comment,
        verified: !!r.bookingId,
        lang: r.locale,
        createdAt: r.createdAt,
      })),
    };
  }

  async create(user: AuthUser, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { user: true, trip: true, review: true },
    });
    if (!booking || booking.userId !== user.id) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PAID') throw new ForbiddenException('Only paid bookings can be reviewed');
    if (booking.review) throw new ConflictException('This booking has already been reviewed');

    const review = await this.prisma.review.create({
      data: {
        routeId: booking.trip.routeId,
        userId: user.id,
        bookingId: booking.id,
        authorName: displayName(booking.user.name, booking.user.email),
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        locale: booking.locale,
      },
    });
    return { id: review.id, rating: review.rating, comment: review.comment };
  }
}
