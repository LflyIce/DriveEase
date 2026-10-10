import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacModule } from '../rbac/rbac.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const JWT_SECRET = process.env.JWT_SECRET || 'driveease-dev-secret-change-me';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: JWT_SECRET,
      // 登录永不过期（用户要求）：不设 expiresIn → JWT 无 exp 声明，后端校验永不因时间拒绝；
      // 前端本无会话超时逻辑，仅在收到 401（token 无效）时重新登录
      signOptions: {},
    }),
    RbacModule,
  ],
  controllers: [UsersController, AuthController],
  providers: [UsersService, AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class UsersModule {}
