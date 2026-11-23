import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsEmail,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsUUID() routeId: string;
  @IsUUID() busId: string;
  @IsDateString() departureAt: string;
  @IsOptional() @IsInt() @Min(100) @Max(100_000) priceCents?: number;
}

export class CreateTemplateDto {
  @IsUUID() routeId: string;
  @IsUUID() busId: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'departureTime must be HH:mm' }) departureTime: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) daysOfWeek: number[];
  @IsOptional() @IsInt() @Min(100) @Max(100_000) priceCents?: number;
}

export enum BookingStatusFilter {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export class InviteAdminDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsIn(['en', 'uk', 'de', 'pl']) locale?: string;
}

export class ListBookingsDto {
  @IsOptional() @IsEnum(BookingStatusFilter) status?: BookingStatusFilter;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @MaxLength(60) q?: string;
  @IsOptional() @IsIn(['createdAt', 'code', 'route', 'departure', 'email', 'seats', 'total', 'status']) sort?: string;
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @IsIn(['en', 'uk', 'de', 'pl']) locale?: string;
}

export class ListTripsDto {
  @IsOptional() @IsIn(['upcoming', 'past', 'cancelled']) scope?: string;
  @IsOptional() @MaxLength(40) from?: string;
  @IsOptional() @MaxLength(40) to?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @IsIn(['departure', 'price', 'booked']) sort?: string;
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @IsIn(['en', 'uk', 'de', 'pl']) locale?: string;
}

export class UpdateTripDto {
  @IsInt() @Min(100) @Max(100_000) priceCents: number;
}

export class UpdateRouteDto {
  @IsInt() @Min(100) @Max(100_000) basePriceCents: number;
}

export class PatchTemplateDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(100) @Max(100_000) priceCents?: number;
}

export class ListUsersDto {
  @IsOptional() @MaxLength(60) q?: string;
  @IsOptional() @IsIn(['USER', 'DRIVER', 'ADMIN']) role?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @IsIn(['createdAt', 'email', 'bookings', 'role']) sort?: string;
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
}

export class SetRoleDto {
  @IsIn(['USER', 'DRIVER']) role: 'USER' | 'DRIVER';
}
