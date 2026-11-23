import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { PriceStripDto, SearchTripsDto } from './trips.dto';
import { TripsService } from './trips.service';

@Public()
@Controller()
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('cities')
  cities() {
    return this.prisma.city.findMany({
      select: { slug: true, countryIso: true, lat: true, lng: true, names: true },
      orderBy: { slug: 'asc' },
    });
  }

  @Get('routes')
  async routes() {
    const routes = await this.prisma.route.findMany({ include: { from: true, to: true } });
    return routes.map((r) => ({
      id: r.id,
      from: { slug: r.from.slug, names: r.from.names, lat: r.from.lat, lng: r.from.lng },
      to: { slug: r.to.slug, names: r.to.names, lat: r.to.lat, lng: r.to.lng },
      distanceKm: r.distanceKm,
      durationMin: r.durationMin,
      fromPriceCents: r.basePriceCents,
    }));
  }

  @Get('trips/search')
  search(@Query() q: SearchTripsDto) {
    return this.trips.search(q);
  }

  @Get('trips/prices')
  prices(@Query() q: PriceStripDto) {
    return this.trips.priceStrip(q);
  }

  @Get('trips/:id')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.findOne(id);
  }
}
