import axiosClient from './axiosClient';

export interface UnitItem {
  id: number;
  name: string;
  code: string | null;
  isActive: boolean;
}

export const unitApi = {
  getActiveUnits: () => axiosClient.get<{ data: UnitItem[] }>('/units'),
};
