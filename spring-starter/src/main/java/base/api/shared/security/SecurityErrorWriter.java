package base.api.shared.security;

import base.api.shared.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityErrorWriter {
  private final ObjectMapper mapper;

  public void write(
      HttpServletRequest request, HttpServletResponse response, HttpStatus status, String message)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType("application/json;charset=UTF-8");
    mapper.writeValue(
        response.getOutputStream(), ApiError.of(status, message, request.getRequestURI(), null));
  }
}
