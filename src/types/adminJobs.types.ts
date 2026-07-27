// ==========================================
// ADMIN SYSTEM JOBS (background job execution log + manual triggers)
// Synced against BE: HabitEvolve.Application.Common.DTOs.JobExecutionLogDto,
// HabitEvolve.API.Controllers.AdminJobsController (api/admin/jobs).
// ==========================================

// GET /api/admin/jobs/recent?count=
// AdminJobsController.GetRecent takes a single "count" query param (default 20 when <= 0),
// NOT pageNumber/pageSize — the endpoint isn't paginated, it just returns the N most recent rows.
export interface GetJobLogsQueryParams {
    count?: number;
}

// GET /api/admin/jobs/recent — one row (JobExecutionLogDto)
export interface JobExecutionLogDto {
    jobExecutionLogId: number;
    jobName: string;
    startedAt: string;
    finishedAt: string | null;
    success: boolean;
    resultSummary: string | null;
    errorMessage: string | null;
}
