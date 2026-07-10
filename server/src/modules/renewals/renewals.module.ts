import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenewalRecord } from './entities/renewal-record.entity';
import { Policy } from '../policies/entities/policy.entity';
import { RenewalsController } from './renewals.controller';
import { RenewalsService } from './renewals.service';

@Module({
  imports: [TypeOrmModule.forFeature([RenewalRecord, Policy])],
  controllers: [RenewalsController],
  providers: [RenewalsService],
})
export class RenewalsModule {}
