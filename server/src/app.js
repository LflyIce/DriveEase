import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './database.js';

import customerRoutes from './routes/customers.js';
import vehicleRoutes from './routes/vehicles.js';
import policyRoutes from './routes/policies.js';
import renewalRoutes from './routes/renewals.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';
import logRoutes from './routes/logs.js';
import commercialInsuranceTypeRoutes from './routes/commercialInsuranceTypes.js';
import compulsoryInsuranceTypeRoutes from './routes/compulsoryInsuranceTypes.js';
import insuranceCompanyRoutes from './routes/insuranceCompanies.js';
import uploadRoutes from './routes/upload.js';
import ocrRoutes from './routes/ocr.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 读取 server/.env（COS 凭证等，.gitignore 已忽略 .env）
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
// 生产前端已切换到 client-vue（Vue-Vben），构建产物在 client-vue/apps/web-antd/dist
const clientDist = path.resolve(__dirname, '..', '..', 'client-vue', 'apps', 'web-antd', 'dist');

app.use(cors());
app.use(express.json());

app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/commercial-insurance-types', commercialInsuranceTypeRoutes);
app.use('/api/compulsory-insurance-types', compulsoryInsuranceTypeRoutes);
app.use('/api/insurance-companies', insuranceCompanyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ocr', ocrRoutes);
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
