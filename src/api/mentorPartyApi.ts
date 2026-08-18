import axiosClient from './axiosClient';
import {
    ApiResponse,
    PartyItem,
    CreatePartyPayload,
    UpdatePartyPayload,
    JoinRequestItem,
    PartyMember
} from '../types/api.types';
import type { LosingStreakPlayerDto } from '../types/mentorDashboard.types';

const PARTY_URL = '/Party';

const partyMentorApi = {
    // 1. Tạo Party mới (Tự động điền mentorUserId nếu giao diện quên truyền)
    createParty: async (payload: CreatePartyPayload): Promise<ApiResponse<any>> => {
        const userId = localStorage.getItem('user_id');
        const finalPayload = {
            ...payload,
            mentorUserId: payload.mentorUserId || (userId ? parseInt(userId) : 0)
        };
        const response = await axiosClient.post<ApiResponse<any>>(`${PARTY_URL}/mentor`, finalPayload);
        return response.data;
    },

    // 2. Lấy danh sách Party của Mentor đang đăng nhập (ĐÃ ĐƯỢC SỬA)
    getMentorParties: async (): Promise<ApiResponse<PartyItem[]>> => {
        const userId = localStorage.getItem('user_id');

        // Gửi kèm tham số mentorUserId lên URL giống thói quen viết API của BE
        const response = await axiosClient.get<ApiResponse<PartyItem[]>>(`${PARTY_URL}/mentor`, {
            params: {
                mentorUserId: userId // BE sẽ nhận được: /api/Party/mentor?mentorUserId=8
            }
        });
        return response.data;
    },

    // 3. Xem chi tiết 1 Party
    getPartyById: async (partyId: number): Promise<ApiResponse<PartyItem>> => {
        const response = await axiosClient.get<ApiResponse<PartyItem>>(`${PARTY_URL}/${partyId}`);
        return response.data;
    },

    // 4. Xem danh sách thành viên của 1 Party
    getPartyMembers: async (partyId: number): Promise<ApiResponse<PartyMember[]>> => {
        const response = await axiosClient.get<ApiResponse<PartyMember[]>>(`${PARTY_URL}/${partyId}/members`);
        return response.data;
    },

    // 5. Tạo/Làm mới mã mời (Invite Code)
    generateInviteCode: async (partyId: number): Promise<ApiResponse<string>> => {
        // 1. Lấy ID của mentor đang đăng nhập từ Local Storage
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        // 2. Gắn chính xác biến mentorUserId vào đường dẫn (Query Parameter)
        // Tương tự như cách GET danh sách hoạt động
        const url = `${PARTY_URL}/${partyId}/invite-code?mentorUserId=${mentorId}`;

        // Thực hiện POST request
        const response = await axiosClient.post<ApiResponse<string>>(url);
        return response.data;
    },

    // 6. Lấy danh sách yêu cầu gia nhập nhóm (Pending)
    getJoinRequests: async (partyId: number): Promise<ApiResponse<JoinRequestItem[]>> => {
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        const url = `${PARTY_URL}/${partyId}/join-requests/mentor?mentorUserId=${mentorId}`;

        const response = await axiosClient.get<ApiResponse<JoinRequestItem[]>>(url);
        return response.data;
    },

    // 7. Duyệt yêu cầu tham gia (Approve)
    approveJoinRequest: async (partyId: number, requestId: number): Promise<ApiResponse<any>> => {
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        const url = `${PARTY_URL}/${partyId}/join-requests/${requestId}/approve?mentorUserId=${mentorId}`;

        const response = await axiosClient.post<ApiResponse<any>>(url);
        return response.data;
    },

    // 8. Từ chối yêu cầu tham gia (Reject)
    rejectJoinRequest: async (partyId: number, requestId: number): Promise<ApiResponse<any>> => {
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        const url = `${PARTY_URL}/${partyId}/join-requests/${requestId}/reject?mentorUserId=${mentorId}`;

        const response = await axiosClient.post<ApiResponse<any>>(url);
        return response.data;
    },

    // 9. Đuổi/Xóa một Player khỏi Party
    // BE route: DELETE /api/Party/{id}/members/{userId}/mentor?mentorUserId= (RemoveMember, requires mentorUserId to authorize)
    removePlayerFromParty: async (partyId: number, userId: number): Promise<ApiResponse<any>> => {
        const storedId = localStorage.getItem('user_id');
        const mentorId = storedId ? parseInt(storedId) : 0;
        const url = `${PARTY_URL}/${partyId}/members/${userId}/mentor?mentorUserId=${mentorId}`;
        const response = await axiosClient.delete<ApiResponse<any>>(url);
        return response.data;
    },

    // 10. Cập nhật thông tin Party
    updateParty: async (partyId: number, payload: UpdatePartyPayload): Promise<ApiResponse<any>> => {
        // Tự động lấy Mentor ID để đảm bảo BE không báo lỗi "Không có quyền thao tác"
        const userId = localStorage.getItem('user_id');
        const finalPayload = {
            ...payload,
            mentorUserId: payload.mentorUserId || (userId ? parseInt(userId) : 0)
        };

        // Endpoint: PUT /api/Party/{id}/mentor
        const url = `${PARTY_URL}/${partyId}/mentor`;
        const response = await axiosClient.put<ApiResponse<any>>(url, finalPayload);
        return response.data;
    },

    // 11. Giải tán (Xóa) Party
    deleteParty: async (partyId: number): Promise<ApiResponse<any>> => {
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        // Endpoint: DELETE /api/Party/{id}/mentor
        // Kèm thêm mentorUserId trên URL đề phòng BE yêu cầu phân quyền giống chức năng Invite Code
        const url = `${PARTY_URL}/${partyId}/mentor?mentorUserId=${mentorId}`;
        const response = await axiosClient.delete<ApiResponse<any>>(url);
        return response.data;
    },

    // 12. Chi tiết Player sắp mất Streak — itemized version của UrgentAlertsDto.playersLosingStreak,
    // dùng cho modal "Urgent Alerts" trên Dashboard Mentor.
    getLosingStreakPlayers: async (): Promise<ApiResponse<LosingStreakPlayerDto[]>> => {
        const userId = localStorage.getItem('user_id');
        const mentorId = userId ? parseInt(userId) : 0;

        const url = `${PARTY_URL}/mentor/urgent-alerts/losing-streak-players?mentorUserId=${mentorId}`;

        const response = await axiosClient.get<ApiResponse<LosingStreakPlayerDto[]>>(url);
        return response.data;
    }
};

export default partyMentorApi;