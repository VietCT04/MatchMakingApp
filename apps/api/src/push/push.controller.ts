import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegisterPushTokenDto } from './dto.register-push-token';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('devices')
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterPushTokenDto) {
    return this.pushService.registerDevice(user.id, dto);
  }

  @Delete('devices/:expoPushToken')
  deactivateDevice(@CurrentUser() user: AuthUser, @Param('expoPushToken') expoPushToken: string) {
    return this.pushService.deactivateDevice(user.id, expoPushToken);
  }

  @Get('devices')
  listDevices(@CurrentUser() user: AuthUser) {
    return this.pushService.listActiveDevices(user.id);
  }
}
