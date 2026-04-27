import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingCorrectionService } from './rating-correction.service';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [RatingsController],
  providers: [RatingsService, RatingCorrectionService],
  exports: [RatingsService, RatingCorrectionService],
})
export class RatingsModule {}
