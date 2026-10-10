import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RbacController } from './rbac.controller';
import { RoleOptionsController } from './role-options.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  controllers: [RbacController, RoleOptionsController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
