import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type { JobExecutionLogDto } from '../types/adminJobs.types';

const JOBS_URL = '/admin/jobs';

export const adminJobsApi = {
    // GET /api/admin/jobs/recent?count= — most recent N job execution logs (default 20)
    getRecent: async (count?: number): Promise<ApiResponse<JobExecutionLogDto[]>> => {
        const res = await axiosClient.get<ApiResponse<JobExecutionLogDto[]>>(`${JOBS_URL}/recent`, {
            params: count ? { count } : undefined,
        });
        return res.data;
    },

    // POST /api/admin/jobs/run-all — triggers every registered job; Data = names of jobs actually triggered
    runAll: async (): Promise<ApiResponse<string[]>> => {
        const res = await axiosClient.post<ApiResponse<string[]>>(`${JOBS_URL}/run-all`);
        return res.data;
    },

    // POST /api/admin/jobs/run/{jobName} — fire-and-forget trigger, BE returns no Data payload (just success/message)
    runJob: async (jobName: string): Promise<ApiResponse<object>> => {
        const res = await axiosClient.post<ApiResponse<object>>(
            `${JOBS_URL}/run/${encodeURIComponent(jobName)}`
        );
        return res.data;
    },
};
