import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CORRELATION_ID_HEADER, LOGIN_THROTTLE } from './auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './types/authenticated-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('csrf')
  @HttpCode(200)
  issueCsrf(@Res({ passthrough: true }) res: Response): { csrfToken: string } {
    res.setHeader('Cache-Control', 'no-store');
    return this.authService.issueCsrfToken(res);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      ttl: LOGIN_THROTTLE.short.ttl,
      limit: LOGIN_THROTTLE.short.limit,
    },
  })
  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers(CORRELATION_ID_HEADER) correlationHeader: string | undefined,
    @Body() loginDto: LoginDto,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const correlationId = req.correlationId ?? correlationHeader;
    return this.authService.login(
      loginDto.email,
      loginDto.senha,
      res,
      correlationId,
    );
  }

  @Get('me')
  @HttpCode(200)
  me(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.authService.toUserResponse(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers(CORRELATION_ID_HEADER) correlationHeader: string | undefined,
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    const correlationId = req.correlationId ?? correlationHeader;
    await this.authService.logout(req.sessionId, res, correlationId);
  }
}
