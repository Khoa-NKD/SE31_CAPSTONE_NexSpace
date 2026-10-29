package base.api.shared.dto;

import java.util.List;
import lombok.*;
import org.springframework.data.domain.Page;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {
  private List<T> content;
  private int page;
  private int size;
  private long totalElements;
  private int totalPages;
  private boolean first;
  private boolean last;
  private boolean empty;

  public static <T> PageResponseDTO<T> from(Page<T> page) {
    return new PageResponseDTO<>(
        page.getContent(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.isFirst(),
        page.isLast(),
        page.isEmpty());
  }
}
