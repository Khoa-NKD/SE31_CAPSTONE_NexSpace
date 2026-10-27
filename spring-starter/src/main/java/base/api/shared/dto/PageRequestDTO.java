package base.api.shared.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.Data;
import org.springframework.data.domain.*;

@Data
@Schema(description = "Phân trang bắt đầu từ 0; sort=createdAt,desc")
public class PageRequestDTO {
  @Min(0)
  private int page = 0;

  @Min(1)
  @Max(100)
  private int size = 20;

  private String search;
  private String sort = "createdAt,desc";

  public Pageable toPageable(String defaultSort, Sort.Direction fallback, Set<String> fields) {
    String[] parts = sort == null ? new String[0] : sort.split(",");
    String field =
        parts.length > 0 && fields.contains(parts[0].trim()) ? parts[0].trim() : defaultSort;
    Sort.Direction direction =
        parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()) ? Sort.Direction.ASC : fallback;
    return PageRequest.of(
        Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(direction, field));
  }

  public String normalizedSearch() {
    return search == null || search.isBlank() ? null : search.trim();
  }
}
