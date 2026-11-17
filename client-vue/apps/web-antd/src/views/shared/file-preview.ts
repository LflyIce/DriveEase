/**
 * 材料文件预览工具。
 *
 * 材料分两类：
 * - 图片（jpg/png/...）：由调用方用 antd Image 弹层预览；
 * - 文档（pdf/doc/docx）：Image 无法渲染，改为浏览器新标签打开。
 *   pdf 浏览器原生可预览；doc/docx 走 Office Online 在线预览（公网可访问的 URL）。
 */

const IMAGE_RE = /\.(avif|bmp|gif|jpeg|jpg|png|svg|webp)(\?|#|$)/i;
const DOC_RE = /\.(doc|docx)(\?|#|$)/i;

/** URL 是否为可直接渲染的图片（按扩展名判断） */
export function isImageUrl(url: string): boolean {
  return IMAGE_RE.test(url);
}

/**
 * 打开非图片文件：doc/docx 用 Office Online 预览，其余（pdf 等）直接新标签打开。
 */
export function openFilePreview(url: string): void {
  if (DOC_RE.test(url)) {
    const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(viewer, '_blank', 'noopener');
    return;
  }
  window.open(url, '_blank', 'noopener');
}
