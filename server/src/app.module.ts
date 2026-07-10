import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import path from 'path';
import { DatabaseModule } from './core/database/database.module';
import { LogModule } from './shared/audit/log.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { RenewalsModule } from './modules/renewals/renewals.module';
import { UsersModule } from './modules/users/users.module';
import { LogsModule } from './modules/logs/logs.module';
import { StatsModule } from './modules/stats/stats.module';
import { CommercialInsuranceTypesModule } from './modules/commercial-insurance-types/commercial-insurance-types.module';
import { CompulsoryInsuranceTypesModule } from './modules/compulsory-insurance-types/compulsory-insurance-types.module';
import { InsuranceCompaniesModule } from './modules/insurance-companies/insurance-companies.module';
import { UploadModule } from './modules/upload/upload.module';
import { OcrModule } from './modules/ocr/ocr.module';

// server/dist/app.module.js → ../.. 即仓库根，定位前端构建产物
const clientDist = path.resolve(__dirname, '..', '..', 'client-vue', 'apps', 'web-antd', 'dist');

const appImports: any[] = [
  ConfigModule.forRoot({ isGlobal: true }),
  DatabaseModule,
  LogModule,
  CustomersModule,
  VehiclesModule,
  PoliciesModule,
  RenewalsModule,
  UsersModule,
  LogsModule,
  StatsModule,
  CommercialInsuranceTypesModule,
  CompulsoryInsuranceTypesModule,
  InsuranceCompaniesModule,
  UploadModule,
  OcrModule,
];

// 生产环境托管前端（静态资源 + SPA fallback），API 路径不走静态
if (process.env.NODE_ENV === 'production') {
  appImports.push(
    ServeStaticModule.forRoot({
      rootPath: clientDist,
      exclude: ['/api/(.*)'],
    }),
  );
}

@Module({ imports: appImports })
export class AppModule {}
