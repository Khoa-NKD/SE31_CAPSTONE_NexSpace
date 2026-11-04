package base.api.shared.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {
    private List<T> listObjects;
    private int pageNumber;
    private int pageSize;
    private long totalRecords;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;

    public List<T> getContent() {
        return listObjects;
    }

    public static <T> PageResponseDTO<T> from(Page<T> page) {
        return new PageResponseDTO<>(
                page.getContent(),
                page.getNumber() + 1,  // 1-based for API
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    public List<T> getContent() {
        return listObjects;
    }

    public int getPage() {
        return pageNumber;
    }

    public int getSize() {
        return pageSize;
    }

    public long getTotalElements() {
        return totalRecords;
    }
}
