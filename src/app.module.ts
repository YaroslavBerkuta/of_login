import { Module } from '@nestjs/common';
import { OnlyFansController } from './app.controller';
import { OnlyFansService } from './app.service';
import { Solver } from '@2captcha/captcha-solver';

@Module({
  imports: [],
  controllers: [OnlyFansController],
  providers: [
    OnlyFansService,
    {
      provide: 'Solver',
      useFactory: () => {
        return new Solver('71734859b58383e9d85678b37ed37948');
      },
    },
  ],
})
export class AppModule {}
