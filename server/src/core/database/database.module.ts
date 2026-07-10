import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import path from 'path';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { Vehicle } from '../../modules/vehicles/entities/vehicle.entity';
import { Policy } from '../../modules/policies/entities/policy.entity';
import { RenewalRecord } from '../../modules/renewals/entities/renewal-record.entity';
import { User } from '../../modules/users/entities/user.entity';
import { OperationLog } from '../../modules/logs/entities/operation-log.entity';
import { InsuranceCompany } from '../../modules/insurance-companies/entities/insurance-company.entity';
import { CompulsoryInsuranceType } from '../../modules/compulsory-insurance-types/entities/compulsory-insurance-type.entity';
import { CommercialInsuranceType } from '../../modules/commercial-insurance-types/entities/commercial-insurance-type.entity';
import { SchemaBootstrapService } from './schema-bootstrap.service';

// server/dist/core/database/ → 三层 .. 即 server/，定位 database.sqlite
const DB_PATH = path.resolve(__dirname, '..', '..', '..', 'database.sqlite');

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: DB_PATH,
      autoSave: true, // 每次变更把整文件写回 location（等价原每次写盘）
      synchronize: false, // 复用现有表；schema 由 SchemaBootstrapService 保证
      entities: [
        Customer,
        Vehicle,
        Policy,
        RenewalRecord,
        User,
        OperationLog,
        InsuranceCompany,
        CompulsoryInsuranceType,
        CommercialInsuranceType,
      ],
    }),
  ],
  providers: [SchemaBootstrapService],
})
export class DatabaseModule {}
