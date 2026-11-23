import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LOCALES } from '../common/locale';

export class RegisterDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsIn(LOCALES as unknown as string[]) locale?: string;
  @IsOptional() @IsString() @MaxLength(100) inviteToken?: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(72) password: string;
}
