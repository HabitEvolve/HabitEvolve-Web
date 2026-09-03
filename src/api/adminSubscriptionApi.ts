import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import {
  SubscriptionPackageDto,
  CreatePackagePayload,
  UpdatePackagePayload,
  UpdatePackageResultDto,
  TogglePackageStatusPayload,
  GetPackagesQueryParams,
} from '../types/adminSubscription.types';

const PACKAGES_URL = '/admin/packages';

const adminSubscriptionApi = {
  // GET /api/admin/packages?includeInactive=true
  getPackages: async (params?: GetPackagesQueryParams): Promise<ApiResponse<SubscriptionPackageDto[]>> => {
    const res = await axiosClient.get<ApiResponse<SubscriptionPackageDto[]>>(PACKAGES_URL, { params });
    return res.data;
  },

  // GET /api/admin/packages/{id}
  getPackageById: async (id: number): Promise<ApiResponse<SubscriptionPackageDto>> => {
    const res = await axiosClient.get<ApiResponse<SubscriptionPackageDto>>(`${PACKAGES_URL}/${id}`);
    return res.data;
  },

  // POST /api/admin/packages
  createPackage: async (payload: CreatePackagePayload): Promise<ApiResponse<SubscriptionPackageDto>> => {
    const res = await axiosClient.post<ApiResponse<SubscriptionPackageDto>>(PACKAGES_URL, payload);
    return res.data;
  },

  // PUT /api/admin/packages/{id} — Code is immutable, not sent
  updatePackage: async (id: number, payload: UpdatePackagePayload): Promise<ApiResponse<UpdatePackageResultDto>> => {
    const res = await axiosClient.put<ApiResponse<UpdatePackageResultDto>>(`${PACKAGES_URL}/${id}`, payload);
    return res.data;
  },

  // PATCH /api/admin/packages/{id}/status
  toggleStatus: async (id: number, payload: TogglePackageStatusPayload): Promise<ApiResponse<SubscriptionPackageDto>> => {
    const res = await axiosClient.patch<ApiResponse<SubscriptionPackageDto>>(`${PACKAGES_URL}/${id}/status`, payload);
    return res.data;
  },

  // DELETE /api/admin/packages/{id}
  // BE rejects if any MentorSubscription exists for this package — prefer toggleStatus instead.
  deletePackage: async (id: number): Promise<ApiResponse<void>> => {
    const res = await axiosClient.delete<ApiResponse<void>>(`${PACKAGES_URL}/${id}`);
    return res.data;
  },

  // POST /api/admin/packages/{id}/apply-to-subscribers
  // Standalone from updatePackage's applyToExistingSubscribers flag — for when the admin skipped that
  // checkbox earlier and now wants to push the package's CURRENT values to everyone on it right now.
  applyToSubscribers: async (id: number): Promise<ApiResponse<number>> => {
    const res = await axiosClient.post<ApiResponse<number>>(`${PACKAGES_URL}/${id}/apply-to-subscribers`);
    return res.data;
  },
};

export default adminSubscriptionApi;
