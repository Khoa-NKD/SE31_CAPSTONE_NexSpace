package base.api.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Envelope chung cho mọi response: { success, data, message, statusCode, errors }.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private Boolean success;
    private T data;
    private String message;
    private Integer statusCode;
    private Map<String, String> errors;
}
