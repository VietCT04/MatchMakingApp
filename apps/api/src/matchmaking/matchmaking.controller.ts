import { Controller, Get, Param, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMatchmakingTicketDto } from './dto.create-matchmaking-ticket';
import { MatchmakingListQueryDto } from './dto.matchmaking-list-query';
import { SendProposalMessageDto } from './dto.send-proposal-message';
import { ProposeLocationDto } from './dto.propose-location';
import { CancelProposalDto } from './dto.cancel-proposal';
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

  @Post('proposals/:id/cancel')
  cancelProposal(@CurrentUser() user: AuthUser, @Param('id') proposalId: string, @Body() dto: CancelProposalDto) {
    return this.matchmakingService.cancelProposal(user.id, proposalId, dto.reason);
  }

  @Get('proposals/:id/messages')
  getProposalMessages(@CurrentUser() user: AuthUser, @Param('id') proposalId: string, @Query() query: MatchmakingListQueryDto) {
    return this.matchmakingService.getProposalMessages(user.id, proposalId, query.limit);
  }

  @Post('proposals/:id/messages')
  sendProposalMessage(@CurrentUser() user: AuthUser, @Param('id') proposalId: string, @Body() dto: SendProposalMessageDto) {
    return this.matchmakingService.sendProposalMessage(user.id, proposalId, dto.body);
  }

  @Get('proposals/:id/location-proposals')
  getLocationProposals(@CurrentUser() user: AuthUser, @Param('id') proposalId: string) {
    return this.matchmakingService.getLocationProposals(user.id, proposalId);
  }

  @Post('proposals/:id/location-proposals')
  proposeLocation(@CurrentUser() user: AuthUser, @Param('id') proposalId: string, @Body() dto: ProposeLocationDto) {
    return this.matchmakingService.proposeLocation(user.id, proposalId, dto);
  }

  @Post('location-proposals/:locationProposalId/accept')
  acceptLocationProposal(@CurrentUser() user: AuthUser, @Param('locationProposalId') locationProposalId: string) {
    return this.matchmakingService.acceptLocationProposal(user.id, locationProposalId);
  }

  @Post('location-proposals/:locationProposalId/decline')
  declineLocationProposal(@CurrentUser() user: AuthUser, @Param('locationProposalId') locationProposalId: string) {
    return this.matchmakingService.declineLocationProposal(user.id, locationProposalId);
  }
}
