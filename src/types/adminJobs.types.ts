// ==========================================
// ADMIN SYSTEM JOBS (background job execution log + manual triggers)
// Field names are inferred from the endpoint list — confirm against the real
// BE DTOs (JobExecutionLogDto) once available and adjust if they drift.
// ==========================================

export type JobRunStatus = "Success" | "Failed" | "Running" | string;

// GET /api/admin/jobs/recent?pageNumber=&pageSize=
// pageNumber/pageSize match the convention already confirmed working for
// GET /admin/users (see GetUsersQueryParams) — reused here for consistency.
export interface GetJobLogsQueryParams {
    pageNumber?: number;
    pageSize?: number;
}

// GET /api/admin/jobs/recent — one row
export interface JobLogDto {
    jobLogId: number;
    jobName: string;
    status: JobRunStatus;
    recordsAffected: number | null;
    message: string | null;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
}

// Response for POST /api/admin/jobs/run-all and POST /api/admin/jobs/run/{jobName}
export interface RunJobResultDto {
    jobName: string;
    status: JobRunStatus;
    recordsAffected: number | null;
    message: string | null;
    startedAt: string;
    finishedAt: string | null;
}
