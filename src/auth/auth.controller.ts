import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/signin.dto';
import { RtGuard } from './guards/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  signUp(@Body() createAuthDto: SignupDto) {
    return this.authService.SignUp(createAuthDto);
  }

  @Public()
  @Post('signin')
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.SignIn(loginDto);
  }

  @UseGuards(RtGuard)
  @Post('refresh')
  refresh(@Req() req: { user: { sub: number; refreshToken: string } }) {
    return this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
  }

  @Post('signout')
  signOut(@Req() req: { user: { user_id: number } }) {
    return this.authService.SignOut(req.user.user_id);
  }
}
