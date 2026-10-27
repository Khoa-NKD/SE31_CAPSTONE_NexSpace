package base.api.shared.exception;

import base.api.shared.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> validation(
      MethodArgumentNotValidException ex, HttpServletRequest req) {
    Map<String, String> errors = new LinkedHashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(
            e ->
                errors.putIfAbsent(
                    e.getField(),
                    e.getDefaultMessage() == null
                        ? "Giá trị không hợp lệ"
                        : e.getDefaultMessage()));
    return respond(HttpStatus.BAD_REQUEST, "Dữ liệu nhập không hợp lệ", req, errors);
  }

  @ExceptionHandler(BadRequestException.class)
  public ResponseEntity<ApiError> badRequest(BadRequestException ex, HttpServletRequest req) {
    return respond(HttpStatus.BAD_REQUEST, ex.getMessage(), req, null);
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<ApiError> invalid(Exception ex, HttpServletRequest req) {
    return respond(HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ", req, null);
  }

  @ExceptionHandler(UnauthorizedException.class)
  public ResponseEntity<ApiError> unauthorized(UnauthorizedException ex, HttpServletRequest req) {
    return respond(HttpStatus.UNAUTHORIZED, ex.getMessage(), req, null);
  }

  @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
  public ResponseEntity<ApiError> forbidden(Exception ex, HttpServletRequest req) {
    return respond(HttpStatus.FORBIDDEN, "Không có quyền truy cập", req, null);
  }

  @ExceptionHandler({NotFoundException.class, NoResourceFoundException.class})
  public ResponseEntity<ApiError> notFound(Exception ex, HttpServletRequest req) {
    return respond(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên", req, null);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiError> method(Exception ex, HttpServletRequest req) {
    return respond(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức không được hỗ trợ", req, null);
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ApiError> conflict(ConflictException ex, HttpServletRequest req) {
    return respond(HttpStatus.CONFLICT, ex.getMessage(), req, null);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiError> integrity(Exception ex, HttpServletRequest req) {
    return respond(HttpStatus.CONFLICT, "Dữ liệu trùng lặp hoặc vi phạm ràng buộc", req, null);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest req) {
    log.error("Unhandled request failure", ex);
    return respond(
        HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra, vui lòng thử lại sau", req, null);
  }

  private ResponseEntity<ApiError> respond(
      HttpStatus status, String message, HttpServletRequest req, Map<String, String> errors) {
    return ResponseEntity.status(status)
        .body(ApiError.of(status, message, req.getRequestURI(), errors));
  }
}
