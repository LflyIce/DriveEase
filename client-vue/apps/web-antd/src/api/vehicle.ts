import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace VehicleApi {
  export interface Vehicle {
    id?: number;
    plate_number: string;
    brand: string;
    model: string;
    year?: null | number;
    vin?: null | string;
    engine_number?: null | string;
    customer_id: number;
    customer?: { id: number; name: string; phone: string } | null;
    created_at?: string;
    updated_at?: string;
  }
  export interface PageResult {
    data: Vehicle[];
    total: number;
    page: number;
    pageSize: number;
  }
}

export async function getVehicleList(params: Recordable<any>) {
  const res = await requestClient.get<VehicleApi.PageResult>('/vehicles', {
    params,
  });
  // 后端返回嵌套 customer，这里拍平出 customer_name 方便表格展示
  return {
    items: res.data.map((v) => ({
      ...v,
      customer_name: v.customer?.name,
      customer_phone: v.customer?.phone,
    })),
    total: res.total,
  };
}

export function createVehicle(data: VehicleApi.Vehicle) {
  return requestClient.post<VehicleApi.Vehicle>('/vehicles', data);
}

export function updateVehicle(id: number, data: VehicleApi.Vehicle) {
  return requestClient.put<VehicleApi.Vehicle>(`/vehicles/${id}`, data);
}

export function deleteVehicle(id: number) {
  return requestClient.delete(`/vehicles/${id}`);
}
