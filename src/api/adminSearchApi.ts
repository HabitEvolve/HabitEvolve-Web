import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import { GlobalSearchResultDto } from '../types/adminSearch.types';

// GET /api/admin/global-search?q=&limit=
const adminSearchApi = {
    globalSearch: async (q: string, limit = 8): Promise<ApiResponse<GlobalSearchResultDto>> => {
        const response = await axiosClient.get<ApiResponse<GlobalSearchResultDto>>('/admin/global-search', {
            params: { q, limit },
        });
        return response.data;
    },
};

export default adminSearchApi;
