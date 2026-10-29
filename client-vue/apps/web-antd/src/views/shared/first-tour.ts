import { driver } from 'driver.js';
import type { DriveStep } from 'driver.js';

import 'driver.js/dist/driver.css';
import './first-tour.css';

/**
 * 首次引导导览（driver.js）：localStorage 记「已读」，之后不再演（浏览器本地记忆，
 * 换浏览器/清缓存会再看一次）。走完「知道了」或中途退出（Esc/×）都算已读。
 * key 带版本号（_v1）：以后改步骤/文案换 key 即可对所有人重新导览。
 * 气泡样式见 first-tour.css（popoverClass=de-tour-popover，随 vben 令牌适配暗色）。
 */
export function runFirstTour(key: string, steps: DriveStep[]) {
  if (localStorage.getItem(key)) return;
  const driverObj = driver({
    allowClose: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: '知道了',
    popoverClass: 'de-tour-popover',
    steps,
    onDestroyed: () => localStorage.setItem(key, '1'),
  });
  driverObj.drive();
}
