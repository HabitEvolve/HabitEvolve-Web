export type ConfigValueType = "int" | "double" | "bool" | "string";

export interface SystemConfigDto {
  configId: number;
  configGroup: string;
  configKey: string;
  configValue: string;
  valueType: ConfigValueType;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpsertConfigRequest {
  value: string;
  description?: string;
}

export interface GetConfigsParams {
  group?: string;
  page?: number;
  pageSize?: number;
}
