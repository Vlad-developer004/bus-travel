import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles, type AuthUser } from '../common/auth';
import { CreateTemplateDto, CreateTripDto, InviteAdminDto, ListBookingsDto, ListTripsDto, ListUsersDto, PatchTemplateDto, SetRoleDto, UpdateRouteDto, UpdateTripDto } from './admin.dto';
import { AdminService } from './admin.service';

@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('bookings')
  bookings(@Query() q: ListBookingsDto) {
    return this.admin.bookings(q);
  }

  @Get('team')
  team(@CurrentUser() u: AuthUser) {
    return this.admin.team(u.id);
  }

  @Post('team/invite')
  @HttpCode(200)
  invite(@CurrentUser() u: AuthUser, @Body() dto: InviteAdminDto) {
    return this.admin.inviteAdmin(u.id, dto);
  }

  @Delete('team/:id')
  @HttpCode(204)
  removeAdmin(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.removeAdmin(u.id, id);
  }

  @Delete('team/invites/:id')
  @HttpCode(204)
  revokeInvite(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.revokeInvite(u.id, id);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancelBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.cancelBooking(id);
  }

  @Post('bookings/:id/resend')
  @HttpCode(200)
  resend(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.resendTicket(id);
  }

  @Get('trips')
  trips(@Query() q: ListTripsDto) {
    return this.admin.trips(q);
  }

  @Patch('trips/:id')
  updateTrip(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTripDto) {
    return this.admin.updateTrip(id, dto);
  }

  @Get('routes')
  routes(@Query('locale') locale?: string) {
    return this.admin.routes(locale);
  }

  @Patch('routes/:id')
  @HttpCode(204)
  updateRoute(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRouteDto) {
    return this.admin.updateRoute(id, dto);
  }

  @Patch('templates/:id')
  patchTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchTemplateDto) {
    return this.admin.patchTemplate(id, dto);
  }

  @Get('users')
  users(@Query() q: ListUsersDto) {
    return this.admin.users(q);
  }

  @Patch('users/:id/role')
  @HttpCode(204)
  setRole(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRoleDto) {
    return this.admin.setUserRole(u.id, id, dto.role);
  }

  @Get('buses')
  buses() {
    return this.admin.buses();
  }

  @Post('trips')
  createTrip(@Body() dto: CreateTripDto) {
    return this.admin.createTrip(dto);
  }

  @Post('trips/:id/cancel')
  @HttpCode(200)
  cancelTrip(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.cancelTrip(id);
  }

  @Get('templates')
  templates() {
    return this.admin.templates();
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.admin.createTemplate(dto);
  }
}
