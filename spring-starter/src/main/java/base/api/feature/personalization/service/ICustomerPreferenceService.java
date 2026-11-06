package base.api.feature.personalization.service;

import base.api.feature.personalization.dto.request.UpdateCustomerPreferenceDto;
import base.api.feature.personalization.dto.response.CustomerPreferenceDto;

public interface ICustomerPreferenceService {

    /**
     * Lấy thông tin cấu hình sở thích không gian của khách hàng hiện tại.
     * Trả về DTO rỗng nếu người dùng chưa từng thiết lập, không tạo bản ghi ngầm vào Database.
     *
     * @param actorId ID của người dùng đăng nhập
     * @return CustomerPreferenceDto
     */
    CustomerPreferenceDto getMyPreferences(Long actorId);

    /**
     * Thiết lập mới sở thích không gian. Mỗi khách hàng chỉ được tạo tối đa 1 bản ghi.
     * Ném ConflictException (409) nếu khách hàng đã có cấu hình sở thích trước đó.
     *
     * @param actorId ID của người dùng đăng nhập
     * @param dto     Dữ liệu thiết lập sở thích
     * @return CustomerPreferenceDto sau khi tạo mới
     */
    CustomerPreferenceDto createMyPreferences(Long actorId, UpdateCustomerPreferenceDto dto);

    /**
     * Cập nhật hoặc tạo mới thông tin sở thích không gian của khách hàng hiện tại.
     *
     * @param actorId ID của người dùng đăng nhập
     * @param dto     Dữ liệu cập nhật sở thích
     * @return CustomerPreferenceDto sau khi cập nhật
     */
    CustomerPreferenceDto updateMyPreferences(Long actorId, UpdateCustomerPreferenceDto dto);

    /**
     * Xóa bỏ cấu hình sở thích không gian của khách hàng hiện tại.
     *
     * @param actorId ID của người dùng đăng nhập
     */
    void deleteMyPreferences(Long actorId);
}
