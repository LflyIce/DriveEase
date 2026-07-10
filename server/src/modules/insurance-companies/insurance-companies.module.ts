import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceCompany } from './entities/insurance-company.entity';
import { InsuranceCompaniesController } from './insurance-companies.controller';
import { InsuranceCompaniesService } from './insurance-companies.service';

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceCompany])],
  controllers: [InsuranceCompaniesController],
  providers: [InsuranceCompaniesService],
})
export class InsuranceCompaniesModule {}
