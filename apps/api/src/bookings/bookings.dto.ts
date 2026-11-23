import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LOCALES } from '../common/locale';

export class PassengerDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsInt() @Min(1) @Max(80) seatNumber: number;
  @IsOptional() @IsInt() @Min(0) @Max(2) smallBags?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2) largeBags?: number;
}

export class CreateBookingDto {
  @IsUUID() tripId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @Matches(/^\+?[0-9 ()-]{6,20}$/) contactPhone?: string;
  @IsOptional() @IsIn(LOCALES as unknown as string[]) locale?: string;
}
