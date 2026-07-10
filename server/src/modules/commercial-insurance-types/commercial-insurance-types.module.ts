import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommercialInsuranceType } from './entities/commercial-insurance-type.entity';
import { CommercialInsuranceTypesController } from './commercial-insurance-types.controller';
import { CommercialInsuranceTypesService } from './commercial-insurance-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommercialInsuranceType])],
  controllers: [CommercialInsuranceTypesController],
  providers: [CommercialInsuranceTypesService],
})
export class CommercialInsuranceTypesModule {}
