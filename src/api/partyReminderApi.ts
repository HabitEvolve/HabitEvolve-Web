import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    SharedHpDto,
    PartyReminderSettingDto,
    ReminderDispatchResultDto,
    UpdateReminderSettingsPayload,
} from '../types/mentor.types';

const mid = (): number => {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : 0;
};

const partyReminderApi = {
    getPartyRisk: async (partyId: number): Promise<ApiResponse<SharedHpDto>> => {
        const r = await axiosClient.get<ApiResponse<SharedHpDto>>(
            `/parties/${partyId}/shared-hp/risk`
        );
        return r.data;
    },

    getReminderSettings: async (partyId: number): Promise<ApiResponse<PartyReminderSettingDto>> => {
        const r = await axiosClient.get<ApiResponse<PartyReminderSettingDto>>(
            `/mentor/party/${partyId}/reminder-settings`,
            { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    updateReminderSettings: async (
        partyId: number,
        payload: UpdateReminderSettingsPayload
    ): Promise<ApiResponse<PartyReminderSettingDto>> => {
        const r = await axiosClient.put<ApiResponse<PartyReminderSettingDto>>(
            `/mentor/party/${partyId}/reminder-settings`,
            payload
        );
        return r.data;
    },

    dispatchReminders: async (
        partyId: number,
        reminderType: string = 'ALL'
    ): Promise<ApiResponse<ReminderDispatchResultDto>> => {
        const r = await axiosClient.post<ApiResponse<ReminderDispatchResultDto>>(
            `/parties/${partyId}/reminders/dispatch`,
            { reminderType }
        );
        return r.data;
    },

    // Guild Rally "Custom" — Mentor's own title + content, sent immediately to the whole party
    // (Notification + Party Chat, same delivery pipeline as the 4 preset templates).
    sendCustomRally: async (
        partyId: number,
        title: string,
        content: string
    ): Promise<ApiResponse<ReminderDispatchResultDto>> => {
        const r = await axiosClient.post<ApiResponse<ReminderDispatchResultDto>>(
            `/parties/${partyId}/reminders/custom`,
            { mentorUserId: mid(), title, content }
        );
        return r.data;
    },
};

export default partyReminderApi;
