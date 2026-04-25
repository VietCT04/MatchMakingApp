import { Body, Controller, Post } from '@nestjs/common';

class AuthPlaceholderDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() dto: AuthPlaceholderDto) {
    return {
      message: 'Authentication is not implemented yet.',
      userEmail: dto.email,
      token: 'todo-replace-with-real-jwt',
      todo: 'Integrate real auth provider (e.g. Clerk, Auth0, Cognito) and secure JWT flow.',
    };
  }

  @Post('register')
  register(@Body() dto: AuthPlaceholderDto) {
    return {
      message: 'Registration placeholder accepted.',
      userEmail: dto.email,
      todo: 'Implement password policy, email verification, and account recovery.',
    };
  }
}
