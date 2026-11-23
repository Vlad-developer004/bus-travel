import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class SearchTripsDto {
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) from: string;
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) to: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' }) date: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9) passengers?: number;
}

export class PriceStripDto {
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) from: string;
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) to: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' }) date: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(3) @Max(14) days?: number;
}
