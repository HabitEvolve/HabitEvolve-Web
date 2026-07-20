import axiosClient from './axiosClient';
import { ApiResponse, PaginatedApiResponse } from '../types/api.types';
import type { JobLogDto, GetJobLogsQueryParams, RunJobResultDto } from '../types/adminJobs.types';

const JOBS_URL = '/admin/jobs';

export const adminJobsApi = {
    // GET /api/admin/jobs/recent?pageNumber=&pageSize=
    getRecentLogs: async (params?: GetJobLogsQueryParams): Promise<PaginatedApiResponse<JobLogDto>> => {
        const res = await axiosClient.get<PaginatedApiResponse<JobLogDto>>(`${JOBS_URL}/recent`, { params });
        return res.data;
    },

    // POST /api/admin/jobs/run-all — triggers every registered job, one result per job
    runAll: async (): Promise<ApiResponse<RunJobResultDto[]>> => {
        const res = await axiosClient.post<ApiResponse<RunJobResultDto[]>>(`${JOBS_URL}/run-all`);
        return res.data;
    },

    // POST /api/admin/jobs/run/{jobName}
    runOne: async (jobName: string): Promise<ApiResponse<RunJobResultDto>> => {
        const res = await axiosClient.post<ApiResponse<RunJobResultDto>>(
            `${JOBS_URL}/run/${encodeURIComponent(jobName)}`
        );
        return res.data;
    },
};
