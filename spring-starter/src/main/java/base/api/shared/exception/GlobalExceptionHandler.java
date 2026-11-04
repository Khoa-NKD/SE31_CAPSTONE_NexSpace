package base.api.shared.exception;

import base.api.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(base.api.feature.organizer.service.OrganizerApplicationValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleApplicationValidation(
            base.api.feature.organizer.service.OrganizerApplicationValidationException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                .success(false).statusCode(400).message(ex.getMessage()).errors(ex.getErrors()).build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex, WebRequest req) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() == null ? "Giá trị không hợp lệ" : fe.getDefaultMessage(),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
        String firstMessage = errors.values().stream().findFirst().orElse("Dữ liệu không hợp lệ");
        log.warn("[{}] Validation failed: {}", req.getDescription(false), errors);

        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .success(false)
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .message(firstMessage)
                .errors(errors)
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler({
            BadRequestException.class,
            IllegalArgumentException.class,
            MissingServletRequestParameterException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException ex, WebRequest req) {
        return build("Request body không hợp lệ", req, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadSize(Exception ex, WebRequest req, HttpServletRequest request) {
        // Preserve each feature's existing upload error contract.
        if (request.getRequestURI().equals(request.getContextPath() + "/api/organizer/applications")
                || request.getRequestURI().equals(request.getContextPath() + "/api/organizer/verification-documents")) {
            return build("Document exceeds the upload size limit (5 MB per file)", req, HttpStatus.PAYLOAD_TOO_LARGE);
        }
        return build("Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB).", req, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaType(Exception ex, WebRequest req) {
        return build("Unsupported request content type", req, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        return build("Access denied", req, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler({NotFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ApiResponse<Void>> handleNotFound(Exception ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex, WebRequest req) {
        return build(ex.getMessage(), req, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAny(Exception ex, WebRequest req) {
        log.error("[{}] Unhandled error", req.getDescription(false), ex);
        // Không trả chi tiết lỗi nội bộ ra client.
        return build("Đã có lỗi xảy ra, vui lòng thử lại sau", req, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<ApiResponse<Void>> build(String message, WebRequest req, HttpStatus status) {
        if (status.is4xxClientError()) {
            log.warn("[{}] {}", req.getDescription(false), message);
        }
        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .success(false)
                .statusCode(status.value())
                .message(message)
                .build();
        return ResponseEntity.status(status).body(body);
    }
}
