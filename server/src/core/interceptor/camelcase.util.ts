/**
 * 递归把普通对象/数组的 **键** 由 snake_case 转为 camelCase。
 * 关键约束：string / number / boolean / null / Date 等 **值** 原样返回，
 * 故 JSON-in-TEXT 列（compulsory_detail / commercial_detail / follow_status）
 * 作为字符串返回时，其内部 JSON 键不会被误改 —— 与前端把它们当不透明字符串处理一致。
 */
export function deepCamelKeys<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (input instanceof Date || Buffer.isBuffer(input)) return input;
  if (Array.isArray(input)) return input.map(deepCamelKeys) as unknown as T;
  if (typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(input as Record<string, any>)) {
      out[toCamelCase(key)] = deepCamelKeys((input as Record<string, any>)[key]);
    }
    return out as unknown as T;
  }
  return input;
}

function toCamelCase(key: string): string {
  if (!key.includes('_')) return key;
  return key.replace(/_([a-z0-9])/gi, (_, c) => c.toUpperCase());
}
