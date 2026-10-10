import { Module } from '@nestjs/common';
import { ViewerController } from './viewer.controller';
import { ViewerService } from './viewer.service';

@Module({
  controllers: [ViewerController],
  providers: [ViewerService],
  exports: [ViewerService],
})
export class ViewerModule {}
