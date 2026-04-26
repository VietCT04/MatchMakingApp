import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto } from './dto.chat-messages-query';
import { CreateChatMessageDto } from './dto.create-chat-message';

@Controller('matches/:id/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ChatMessagesQueryDto,
  ) {
    return this.chatService.getMessages(id, user.id, query);
  }

  @Post('messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.chatService.sendMessage(id, user.id, dto);
  }
}
