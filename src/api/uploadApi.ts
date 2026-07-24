import { supabase } from './supabaseClient';

export const uploadApi = {
    /**
     * Upload ảnh lên Supabase Storage và lấy Public URL
     * @param file File ảnh người dùng chọn
     * @param bucketName Tên bucket đã tạo trên Supabase (mặc định là 'avatars')
     * @returns Trả về URL của ảnh nếu thành công, hoặc null nếu thất bại
     */
    uploadImage: async (file: File, bucketName: string = 'avatars'): Promise<string | null> => {
        try {
            // 1. Tạo tên file độc nhất để không bị ghi đè (VD: 1684392_xyz.png)
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`; // Lưu vào thư mục public bên trong bucket

            // 2. Gọi API Upload của Supabase
            const { error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false // Không ghi đè nếu trùng tên
                });

            if (error) {
                console.error("Lỗi khi upload lên Supabase:", error.message);
                throw error;
            }

            // 3. Lấy đường link Public URL để lưu vào Database của bạn
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return urlData.publicUrl;

        } catch (error) {
            console.error("Lỗi hệ thống khi upload ảnh:", error);
            return null;
        }
    }
};