import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompulsoryInsuranceType } from './entities/compulsory-insurance-type.entity';
import { CompulsoryInsuranceTypesController } from './compulsory-insurance-types.controller';
import { CompulsoryInsuranceTypesService } from './compulsory-insurance-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompulsoryInsuranceType])],
  controllers: [CompulsoryInsuranceTypesController],
  providers: [CompulsoryInsuranceTypesService],
})
export class CompulsoryInsuranceTypesModule {}
