import { Router } from 'express';
import { log } from '../database.js';
import { recognizeIDCard, recognizeVehicleLicense } from '../ocr.js';

const router = Router();

// 行驶证识别 → 返回映射后的保单字段
router.get('/vehicle-license', async (req, res) => {
  try {
    const { imageUrl, side } = req.query;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl' });
    const info = await recognizeVehicleLicense(imageUrl, side === 'back' ? 'back' : 'front');
    log({ operator: '管理员', action: 'OCR 行驶证识别', target: imageUrl });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 身份证识别 → 返回映射后的客户字段（预留）
router.get('/id-card', async (req, res) => {
  try {
    const { imageUrl, side } = req.query;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl' });
    const info = await recognizeIDCard(imageUrl, side === 'back' ? 'back' : 'front');
    log({ operator: '管理员', action: 'OCR 身份证识别', target: imageUrl });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
