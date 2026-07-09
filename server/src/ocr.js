import tencentcloud from 'tencentcloud-sdk-nodejs-ocr';

const OcrClient = tencentcloud.ocr.v20181119.Client;

// COS 与 OCR 同为腾讯云产品，复用 server/.env 的 COS_SECRET_ID/KEY（CAM 密钥通用）
let clientInstance = null;
function getClient() {
  if (!clientInstance) {
    clientInstance = new OcrClient({
      credential: {
        secretId: process.env.COS_SECRET_ID,
        secretKey: process.env.COS_SECRET_KEY,
      },
      region: '',
      profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } },
    });
  }
  return clientInstance;
}

function isConfigured() {
  return !!(process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY);
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new Error('OCR 未配置（请填写 server/.env 的 COS_SECRET_ID/KEY）');
  }
}

// 燃料类型 → 油电分类（油车/电车/天然气）
function mapFuelType(fuel) {
  if (!fuel) return '';
  if (fuel.includes('电')) return '电车';
  if (fuel.includes('天然气') || fuel.includes('气')) return '天然气';
  return '油车'; // 汽油/柴油默认油车
}

/**
 * 行驶证识别
 * @param {string} imageUrl COS 直链
 * @param {'front'|'back'} side 正面 FrontInfo / 反面 BackInfo（CardSide=BACK）
 */
export async function recognizeVehicleLicense(imageUrl, side = 'front') {
  ensureConfigured();
  const params = { ImageUrl: imageUrl };
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

/**
 * 身份证识别
 * @param {string} imageUrl COS 直链
 * @param {'front'|'back'} side 正面人像面 / 反面国徽面（CardSide=BACK）
 */
export async function recognizeIDCard(imageUrl, side = 'front') {
  ensureConfigured();
  const params = { ImageUrl: imageUrl };
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

export default { recognizeVehicleLicense, recognizeIDCard };
