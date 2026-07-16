import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** JWT 载荷：登录时签发，Guard 解析后注入 req.user */
export interface JwtPayload {
  userId: number;
  username: string;
  roleId: null | number;
  role: string; // 冗余旧 role 列（显示兼容）
  roleCode: null | string; // 角色 code，'admin' 即超级角色，PermissionGuard 据此短路
}

const JWT_SECRET = process.env.JWT_SECRET || 'driveease-dev-secret-change-me';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // 返回值挂在 req.user 上，供 PermissionGuard 使用
    return {
      userId: payload.userId,
      username: payload.username,
      roleId: payload.roleId,
      role: payload.role,
      roleCode: payload.roleCode,
    };
  }
}
