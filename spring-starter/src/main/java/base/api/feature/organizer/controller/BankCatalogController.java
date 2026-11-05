package base.api.feature.organizer.controller;

import base.api.feature.organizer.dto.response.BankOptionResponse;
import base.api.feature.organizer.service.BankCatalogService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class BankCatalogController extends BaseAPIController {
    private final BankCatalogService service;

    @GetMapping("/api/public/banks")
    public ResponseEntity<ApiResponse<List<BankOptionResponse>>> list() {
        return success(service.list());
    }
}
