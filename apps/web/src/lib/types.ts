export type Names = Record<'en' | 'uk' | 'de' | 'pl', string>;

export interface CityRef {
  slug: string;
  names: Names;
  lat: number;
  lng: number;
  station?: string;
  countryIso?: string;
}

export interface Route {
  id: string;
  from: CityRef;
  to: CityRef;
  distanceKm: number;
  durationMin: number;
  fromPriceCents: number;
}

export interface Rating {
  average: number;
  count: number;
}

export interface PriceDay {
  date: string;
  priceCents: number | null;
  currency: string;
}

export interface ReviewList {
  average: number;
  count: number;
  distribution: { star: number; count: number }[];
  items: { id: string; author: string; rating: number; comment: string | null; verified: boolean; lang: string; createdAt: string }[];
}

export interface TripSummary {
  id: string;
  departureAt: string;
  arrivalAt: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  from: CityRef;
  to: CityRef;
  seatCount: number;
  seatsLeft: number;
  busModel: string;
  rating?: Rating | null;
}

export interface TripDetail extends TripSummary {
  takenSeats: number[];
  status: string;
}

export type BookingStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  totalCents: number;
  currency: string;
  expiresAt: string;
  paidAt: string | null;
  trip: { id: string; departureAt: string; arrivalAt: string; status: string; from: CityRef; to: CityRef };
  seats: { seatNumber: number; passengerName: string; smallBags: number; largeBags: number; boarded: boolean }[];
  qr: string | null;
  review?: { rating: number; comment: string | null } | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'DRIVER' | 'ADMIN';
  isOwner?: boolean;
  locale: string;
  emailVerified: boolean;
}
