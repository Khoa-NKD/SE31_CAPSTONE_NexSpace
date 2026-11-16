package base.api.feature.resource.dto;

import base.api.shared.entity.resource.BookableResourceModel;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ngữ cảnh chứa thông tin tài nguyên đã được khóa thành công bằng khóa bi quan (Pessimistic Write Lock)
 * phục vụ kiểm soát đồng thời và chống đặt trùng (Mutual Exclusion & Concurrency Defense).
 */
@Value
@Builder
public class LockedResourceContext {
    BookableResourceModel targetResource;
    List<BookableResourceModel> lockedResources;
    List<Long> lockedResourceIds;
    LocalDateTime startTime;
    LocalDateTime endTime;
}

