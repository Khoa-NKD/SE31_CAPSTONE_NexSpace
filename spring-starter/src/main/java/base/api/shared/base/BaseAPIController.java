package base.api.shared.base;

import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.security.CurrentUserProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Base cho mọi controller: helper trả về {@link ApiResponse} thống nhất và lấy user hiện tại.
 */
public abstract class BaseAPIController {

    @Autowired
    protected CurrentUserProvider currentUserProvider;

    protected <T> ResponseEntity<ApiResponse<T>> success(T data, String message) {
        return ResponseEntity.ok(new ApiResponse<>(true, data, message, HttpStatus.OK.value(), null));
    }

    protected <T> ResponseEntity<ApiResponse<T>> success(T data) {
        return success(data, "Success");
    }

    protected <T> ResponseEntity<ApiResponse<T>> created(T data, String message) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, data, message, HttpStatus.CREATED.value(), null));
    }

    protected <T> ResponseEntity<ApiResponse<PageResponseDTO<T>>> successPage(Page<T> page) {
        return success(PageResponseDTO.from(page), "Data retrieved successfully");
    }

    protected Long getCurrentUserId() {
        return currentUserProvider.getCurrentUserId();
    }
}
