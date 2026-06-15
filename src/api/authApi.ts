import axiosClient from './axiosClient';
import { RegisterPayload, LoginPayload } from '../types/api.types';

const authApi = {
    register: async (payload: RegisterPayload) => {
        const url = '/User/register';
        const response = await axiosClient.post(url, payload);
        return response.data;
    },

    login: async (payload: LoginPayload) => {
        const url = '/User/login';
        const response = await axiosClient.post(url, payload);
        return response.data;
    }
};

export default authApi;