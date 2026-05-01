function isCommonInsuranceType(item) {
  return item?.is_common === true || item?.is_common === 1 || item?.is_common === '1';
}

function toDefaultInsuranceRow(item) {
  return {
    type_id: item.id,
    name: item.name,
    discount: 100,
  };
}

export function buildDefaultInsuranceValues({ compulsoryTypes = [], commercialTypes = [] } = {}) {
  const compulsoryItems = compulsoryTypes.filter(isCommonInsuranceType).map(toDefaultInsuranceRow);
  const commercialItems = commercialTypes
    .filter((item) => item.status !== '禁用')
    .filter(isCommonInsuranceType)
    .map(toDefaultInsuranceRow);

  return {
    compulsory_enabled: compulsoryItems.length > 0,
    commercial_enabled: commercialItems.length > 0,
    compulsory_items: compulsoryItems,
    commercial_items: commercialItems,
  };
}

function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

export function mergeCommonInsuranceDefaults(currentValues = {}, { compulsoryTypes = [], commercialTypes = [] } = {}) {
  const commonDefaults = buildDefaultInsuranceValues({ compulsoryTypes, commercialTypes });
  const hasCompulsoryRows = hasRows(currentValues.compulsory_items);
  const hasCommercialRows = hasRows(currentValues.commercial_items);

  return {
    ...currentValues,
    compulsory_enabled: hasCompulsoryRows ? currentValues.compulsory_enabled : commonDefaults.compulsory_enabled,
    commercial_enabled: hasCommercialRows ? currentValues.commercial_enabled : commonDefaults.commercial_enabled,
    compulsory_items: hasCompulsoryRows ? currentValues.compulsory_items : commonDefaults.compulsory_items,
    commercial_items: hasCommercialRows ? currentValues.commercial_items : commonDefaults.commercial_items,
  };
}
