import { Controller, Post, Body } from '@nestjs/common';
import { OnlyFansService } from './app.service';

@Controller('onlyfans')
export class OnlyFansController {
  constructor(private readonly onlyFansService: OnlyFansService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    return this.onlyFansService.login(username, password);
  }
}
