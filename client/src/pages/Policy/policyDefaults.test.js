import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDefaultInsuranceValues, mergeCommonInsuranceDefaults } from './policyDefaults.js';

test('buildDefaultInsuranceValues preloads common compulsory and enabled commercial insurance types', () => {
  const values = buildDefaultInsuranceValues({
    compulsoryTypes: [
      { id: 1, name: '交强险', is_common: 1 },
      { id: 2, name: '代收车船税', is_common: 0 },
    ],
    commercialTypes: [
      { id: 11, name: '第三者责任险', status: '启用', is_common: 1 },
      { id: 12, name: '车辆损失险', status: '禁用', is_common: 1 },
      { id: 13, name: '划痕险', status: '启用', is_common: 0 },
    ],
  });

  assert.equal(values.compulsory_enabled, true);
  assert.equal(values.commercial_enabled, true);
  assert.deepEqual(values.compulsory_items, [{ type_id: 1, name: '交强险', discount: 100 }]);
  assert.deepEqual(values.commercial_items, [{ type_id: 11, name: '第三者责任险', discount: 100 }]);
});

test('buildDefaultInsuranceValues leaves insurance sections disabled when nothing is common', () => {
  const values = buildDefaultInsuranceValues({
    compulsoryTypes: [{ id: 1, name: '交强险', is_common: 0 }],
    commercialTypes: [{ id: 11, name: '第三者责任险', status: '启用', is_common: 0 }],
  });

  assert.equal(values.compulsory_enabled, false);
  assert.equal(values.commercial_enabled, false);
  assert.deepEqual(values.compulsory_items, []);
  assert.deepEqual(values.commercial_items, []);
});

test('mergeCommonInsuranceDefaults fills empty insurance rows after base policy values already exist', () => {
  const values = mergeCommonInsuranceDefaults(
    {
      policy_number: 'POL-20260501-001',
      compulsory_enabled: false,
      commercial_enabled: false,
      compulsory_items: [],
      commercial_items: [],
    },
    {
      compulsoryTypes: [{ id: 2, name: '代收车船税', is_common: 1 }],
      commercialTypes: [{ id: 11, name: '第三者责任险', status: '启用', is_common: 1 }],
    }
  );

  assert.equal(values.policy_number, 'POL-20260501-001');
  assert.equal(values.compulsory_enabled, true);
  assert.equal(values.commercial_enabled, true);
  assert.deepEqual(values.compulsory_items, [{ type_id: 2, name: '代收车船税', discount: 100 }]);
  assert.deepEqual(values.commercial_items, [{ type_id: 11, name: '第三者责任险', discount: 100 }]);
});

test('mergeCommonInsuranceDefaults does not replace rows the user already has', () => {
  const values = mergeCommonInsuranceDefaults(
    {
      compulsory_enabled: true,
      commercial_enabled: true,
      compulsory_items: [{ type_id: 1, name: '交强险', discount: 100 }],
      commercial_items: [{ type_id: 12, name: '车辆损失险', discount: 100 }],
    },
    {
      compulsoryTypes: [{ id: 2, name: '代收车船税', is_common: 1 }],
      commercialTypes: [{ id: 11, name: '第三者责任险', status: '启用', is_common: 1 }],
    }
  );

  assert.deepEqual(values.compulsory_items, [{ type_id: 1, name: '交强险', discount: 100 }]);
  assert.deepEqual(values.commercial_items, [{ type_id: 12, name: '车辆损失险', discount: 100 }]);
});
