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
     * Tải lên ảnh thuộc về một không gian làm việc cụ thể.
     * Tự động lưu vào thư mục động theo cấu hình: nexspace/workspaces/{workspaceId}.
     *
     * @param file        MultipartFile được gửi từ client.
     * @param workspaceId ID không gian làm việc.
     * @param actorId     ID người dùng thực hiện tải lên.
     * @return DTO chứa đường dẫn URL ảnh, publicId, kích thước và định dạng.
     */
    MediaUploadResponseDto uploadWorkspaceImage(MultipartFile file, Long workspaceId, Long actorId);

    /**
     * Giải quyết đường dẫn thư mục lưu trữ cho không gian làm việc.
     * Nếu workspaceId != null, thay thế placeholder {id} trong pattern cấu hình.
     *
     * @param workspaceId ID không gian làm việc (có thể null nếu là thư mục mặc định).
     * @return Đường dẫn thư mục hoàn chỉnh (ví dụ: nexspace/workspaces/15).
     */
    String resolveWorkspaceFolder(Long workspaceId);

    /**
     * Xóa một file ảnh khỏi hệ thống lưu trữ theo publicId.
     *
     * @param publicId Public ID của ảnh trên Cloudinary hoặc tên file cục bộ.
     * @param actorId  ID người dùng thực hiện xóa.
     */
    void deleteImage(String publicId, Long actorId);
}

