package base.api.shared.base;

import base.api.shared.dto.*;
import base.api.shared.security.CurrentUserProvider;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.*;

public abstract class BaseAPIController {
  @Autowired protected CurrentUserProvider currentUserProvider;

  protected <T> ResponseEntity<ApiResponse<T>> success(T data, String message) {
    return ResponseEntity.ok(
        ApiResponse.<T>builder().success(true).data(data).message(message).build());
  }

  protected <T> ResponseEntity<ApiResponse<T>> success(T data) {
    return success(data, "Success");
  }

  protected <T> ResponseEntity<ApiResponse<T>> created(T data, String message) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.<T>builder().success(true).data(data).message(message).build());
  }

  protected <T> ResponseEntity<ApiResponse<PageResponseDTO<T>>> successPage(Page<T> page) {
    return success(PageResponseDTO.from(page));
  }

  protected UUID getCurrentUserId() {
    return currentUserProvider.getCurrentUserId();
  }
}
