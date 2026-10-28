/**
 * 极速开单「回车跳下一必填项」：
 * 在表单容器上监听 keydown（capture），Enter 时把焦点移到 DOM 顺序中下一个必填项的可输入控件。
 * 依赖 vben form 的必填行类名 `form-is-required`（form-field.vue :class）；
 * RadioGroup/CheckboxGroup 的 input（radio/checkbox）不参与——不是键入型控件，
 * 行内只剩这类 input 的必填项（如「保期」按钮组）自然被跳过。
 */

/** 取必填项里第一个可聚焦的键入控件（input/textarea，排除 radio/checkbox/hidden） */
function focusableOf(item: HTMLElement): HTMLElement | null {
  return item.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea',
  );
}

/**
 * 找 from 所在项之后（DOM 顺序）的下一个必填可输入控件。
 * from 在必填项里 → 找更靠后的必填项；在可选项里（如备注/保费）→ 找其后的第一个必填。
 * 返回 null 表示后面没有必填项（交由调用方保持原状）。
 */
export function enterToNextRequired(
  container: HTMLElement,
  from: HTMLElement,
): HTMLElement | null {
  const requiredItems = Array.from(
    container.querySelectorAll<HTMLElement>('[class*="form-is-required"]'),
  );
  const currentItem = from.closest<HTMLElement>('[class*="form-is-required"]');
  for (const item of requiredItems) {
    const el = focusableOf(item);
    if (!el) continue;
    if (currentItem) {
      if (
        item !== currentItem &&
        currentItem.compareDocumentPosition(item) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        return el;
      }
    } else if (
      from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      return el;
    }
  }
  return null;
}
