import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace VehicleApi {
  export interface Vehicle {
    id?: number;
    plateNumber: string;
    brand: string;
    model: string;
    year?: null | number;
    vin?: null | string;
    engineNumber?: null | string;
    customerId: number;
    customer?: { id: number; name: string; phone: string } | null;
    createdAt?: string;
    updatedAt?: string;
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
  // 后端返回嵌套 customer，这里拍平出 customerName 方便表格展示
  return {
    items: res.data.map((v) => ({
      ...v,
      customerName: v.customer?.name,
      customerPhone: v.customer?.phone,
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
