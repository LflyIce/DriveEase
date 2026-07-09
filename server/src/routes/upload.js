import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import COS from 'cos-nodejs-sdk-v5';
import { log } from '../database.js';

const router = Router();

// 文件暂存内存（上限 20MB），由 cos SDK 直接上传，不落本地磁盘
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// COS 凭证延迟初始化：等 dotenv.config() 生效后再创建实例（ESM 顶层 import 时 env 尚未载入）
let cosInstance = null;
function getCos() {
  if (!cosInstance) {
    cosInstance = new COS({
      SecretId: process.env.COS_SECRET_ID,
      SecretKey: process.env.COS_SECRET_KEY,
    });
  }
  return cosInstance;
}

function isConfigured() {
  return !!(
    process.env.COS_BUCKET &&
    process.env.COS_REGION &&
    process.env.COS_SECRET_ID &&
    process.env.COS_SECRET_KEY
  );
}

// 前端 requestClient.upload('/upload', { file }) → multer.single('file') 接收
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未提供文件' });
    if (!isConfigured()) {
      return res.status(500).json({ error: 'COS 未配置（请填写 server/.env）' });
    }

    const ext = path.extname(req.file.originalname) || '';
    const today = new Date().toISOString().slice(0, 10);
    const key = `policy/${today}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;

    await getCos().putObject({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: key,
      Body: req.file.buffer,
    });

    // 公共读直链
    const url = `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${key}`;
    log({
      operator: '管理员',
      action: '上传文件',
      target: req.file.originalname,
    });
    res.json({ url, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
