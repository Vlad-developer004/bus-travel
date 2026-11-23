import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsUUID() bookingId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(600) comment?: string;
}

export class ListReviewsDto {
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) from: string;
  @IsString() @Matches(/^[a-z0-9-]{2,40}$/) to: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
