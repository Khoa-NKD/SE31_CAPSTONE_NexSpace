package base.api.feature.operations.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class MaintenanceDtos {
    private MaintenanceDtos() {}
    public record Target(String key,String name,String kind,Integer floorNumber,Long resourceId,Long parentRoomId) {}
    public record Schedule(String key,String targetKey,String name,String kind,Integer floorNumber,
            LocalDateTime startTime,LocalDateTime endTime,String reason,List<String> targetKeys,boolean wholeWorkspace) {
        public Schedule(String key,String targetKey,String name,String kind,Integer floorNumber,LocalDateTime startTime,LocalDateTime endTime,String reason) { this(key,targetKey,name,kind,floorNumber,startTime,endTime,reason,List.of(targetKey),false); }
    }
    public record Input(@NotNull List<@NotBlank String> targetKeys,
            @NotNull LocalDateTime startTime,@NotNull LocalDateTime endTime,@NotBlank @Size(max=255) String reason, boolean wholeWorkspace) {
        public Input(List<String> targetKeys, LocalDateTime startTime, LocalDateTime endTime, String reason) { this(targetKeys, startTime, endTime, reason, false); }
    }
}
