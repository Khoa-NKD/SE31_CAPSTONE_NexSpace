package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

public interface IMediaStorageService {

    /**
     * Tải lên một file ảnh lên hệ thống lưu trữ (Cloudinary hoặc Local Fallback).
     *
     * @param file    MultipartFile được gửi từ client (tối đa 5MB, JPG/PNG/WebP).
     * @param folder  Thư mục lưu trữ logic (tuỳ chọn, mặc định nexspace/workspaces).
     * @param actorId ID người dùng thực hiện tải lên (được trích xuất từ JWT).
     * @return DTO chứa đường dẫn URL ảnh, publicId, kích thước và định dạng.
     */
    MediaUploadResponseDto uploadImage(MultipartFile file, String folder, Long actorId);

    /**
     * Xóa một file ảnh khỏi hệ thống lưu trữ theo publicId.
     *
     * @param publicId Public ID của ảnh trên Cloudinary hoặc tên file cục bộ.
     * @param actorId  ID người dùng thực hiện xóa.
     */
    void deleteImage(String publicId, Long actorId);
}

