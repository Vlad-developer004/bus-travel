import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { Roles } from '../common/auth';
import { TicketsService } from './tickets.service';

class ScanDto {
  @IsString() @MaxLength(100) token: string;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Roles('DRIVER', 'ADMIN')
  @HttpCode(200)
  @Post('scan')
  scan(@Body() dto: ScanDto) {
    return this.tickets.scan(dto.token);
  }
}
