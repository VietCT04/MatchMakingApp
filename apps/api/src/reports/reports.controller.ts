import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserReportDto } from './dto.create-user-report';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('users')
  @UseGuards(JwtAuthGuard)
  createUserReport(@CurrentUser() user: AuthUser, @Body() dto: CreateUserReportDto) {
    return this.reportsService.createUserReport(user.id, dto);
  }
}
