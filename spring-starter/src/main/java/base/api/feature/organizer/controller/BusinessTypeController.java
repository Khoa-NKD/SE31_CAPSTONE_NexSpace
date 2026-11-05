package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.BusinessTypeResponse;
import base.api.feature.organizer.service.BusinessTypeService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class BusinessTypeController extends BaseAPIController {
    private final BusinessTypeService service;

    @GetMapping("/api/public/business-types")
    public ResponseEntity<ApiResponse<List<BusinessTypeResponse>>> list() {
        return success(service.list());
    }
}
