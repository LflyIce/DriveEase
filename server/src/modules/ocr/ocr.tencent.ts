// 腾讯云 OCR 调用隔离层：SDK 用延迟 require 加载，避免其加载失败拖垮应用启动。
// COS 与 OCR 同为腾讯云产品，复用 server/.env 的 COS_SECRET_ID/KEY（CAM 密钥通用）。

let clientInstance: any = null;

function getClient(): any {
  if (!clientInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tencentcloud = require('tencentcloud-sdk-nodejs-ocr');
    const OcrClient = tencentcloud.ocr.v20181119.Client;
    clientInstance = new OcrClient({
      credential: { secretId: process.env.COS_SECRET_ID, secretKey: process.env.COS_SECRET_KEY },
      region: '',
      profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } },
    });
  }
  return clientInstance;
}

function isConfigured(): boolean {
  return !!(process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY);
}

function ensureConfigured(): void {
  if (!isConfigured()) {
    throw new Error('OCR 未配置（请填写 server/.env 的 COS_SECRET_ID/KEY）');
  }
}

// 燃料类型 → 油电分类（油车/电车/天然气）
function mapFuelType(fuel: string): string {
  if (!fuel) return '';
  if (fuel.includes('电')) return '电车';
  if (fuel.includes('天然气') || fuel.includes('气')) return '天然气';
  return '油车';
}

/** 行驶证识别（键保持 snake_case，由响应拦截器统一转 camelCase） */
export async function recognizeVehicleLicense(imageUrl: string, side: 'front' | 'back' = 'front'): Promise<any> {
  ensureConfigured();
  const params: any = { ImageUrl: imageUrl };
  if (side === 'back') params.CardSide = 'BACK';
  const data = await getClient().VehicleLicenseOCR(params);
  if (side === 'back') {
    const b = data?.BackInfo || {};
    return {
      plate_number: b.PlateNo || '',
      seats: b.AllowNum ? String(b.AllowNum).replace(/\D/g, '') : '',
      energy_type: mapFuelType(b.FuelType),
      inspection_record: b.Record || '',
    };
  }
  const f = data?.FrontInfo || {};
  return {
    plate_number: f.PlateNo || '',
    vin: f.Vin || '',
    engine_number: f.EngineNo || '',
    brand_model: f.Model || '',
    register_date: f.RegisterDate || '',
    certificate_date: f.IssueDate || '',
    vehicle_type: f.VehicleType || '',
    owner_name: f.Owner || '',
    owner_address: f.Address || '',
  };
}

/** 身份证识别 */
export async function recognizeIDCard(imageUrl: string, side: 'front' | 'back' = 'front'): Promise<any> {
  ensureConfigured();
  const params: any = { ImageUrl: imageUrl };
  if (side === 'back') params.CardSide = 'BACK';
  const data = await getClient().IDCardOCR(params);
  const r = data || {};
  if (side === 'back') {
    return {
      id_authority: r.Authority || '',
      id_valid_date: r.ValidDate || '',
    };
  }
  return {
    name: r.Name || '',
    id_number: r.IdNum || '',
    address: r.Address || '',
    gender: r.Sex || '',
    nation: r.Nation || '',
    birth: r.Birth || '',
  };
}
