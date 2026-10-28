import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonVehiclePolicy } from './entities/non-vehicle-policy.entity';
import { NonVehiclePoliciesController } from './non-vehicle-policies.controller';
import { NonVehiclePoliciesService } from './non-vehicle-policies.service';

@Module({
  controllers: [NonVehiclePoliciesController],
  imports: [TypeOrmModule.forFeature([NonVehiclePolicy])],
  providers: [NonVehiclePoliciesService],
})
export class NonVehiclePoliciesModule {}
