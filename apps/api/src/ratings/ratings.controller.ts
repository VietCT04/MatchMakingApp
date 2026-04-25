import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { EloPreviewDto } from './dto.elo-preview';
import { DoublesPreviewDto } from './dto.doubles-preview';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('defaults')
  getDefaults() {
    return this.ratingsService.getDefaults();
  }

  @Get()
  list(@Query('userId') userId?: string) {
    return this.ratingsService.listUserRatings(userId);
  }

  @Post('elo/preview')
  preview(@Body() dto: EloPreviewDto) {
    return this.ratingsService.previewUpdate(dto.playerRating, dto.opponentRating, dto.actualScore);
  }

  @Post('elo/preview-doubles')
  previewDoubles(@Body() dto: DoublesPreviewDto) {
    return this.ratingsService.previewDoublesUpdate(dto.teamARatings, dto.teamBRatings, dto.teamAActualScore);
  }
}
