import { Controller, Get, Param, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMatchmakingTicketDto } from './dto.create-matchmaking-ticket';
import { MatchmakingListQueryDto } from './dto.matchmaking-list-query';
import { MatchmakingService } from './matchmaking.service';

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('tickets')
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateMatchmakingTicketDto) {
    return this.matchmakingService.createOrReplaceTicket(user.id, dto);
  }

  @Post('search')
  runSearch(@CurrentUser() user: AuthUser) {
    return this.matchmakingService.runSearchForUser(user.id);
  }

  @Get('tickets/me')
  getMyTickets(@CurrentUser() user: AuthUser, @Query() query: MatchmakingListQueryDto) {
    return this.matchmakingService.getMyTickets(user.id, query.limit);
  }

  @Get('proposals/me')
  getMyProposals(@CurrentUser() user: AuthUser, @Query() query: MatchmakingListQueryDto) {
    return this.matchmakingService.getMyProposals(user.id, query.limit);
  }

  @Post('proposals/:id/accept')
  acceptProposal(@CurrentUser() user: AuthUser, @Param('id') proposalId: string) {
    return this.matchmakingService.acceptProposal(user.id, proposalId);
  }

  @Post('proposals/:id/decline')
  declineProposal(@CurrentUser() user: AuthUser, @Param('id') proposalId: string) {
    return this.matchmakingService.declineProposal(user.id, proposalId);
  }
}
