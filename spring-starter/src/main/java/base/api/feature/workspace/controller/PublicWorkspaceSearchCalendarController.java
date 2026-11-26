package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.PublicWorkspaceFilterRequestDto;
import base.api.feature.workspace.dto.response.SearchCalendarDto;
import base.api.feature.workspace.service.WorkspaceSearchCalendarService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/public/workspaces", "/api/v1/public/workspaces"})
public class PublicWorkspaceSearchCalendarController extends BaseAPIController {
    private final WorkspaceSearchCalendarService calendars;

    @GetMapping("/search-calendar")
    public ResponseEntity<ApiResponse<SearchCalendarDto>> calendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long workspaceId,
            @ModelAttribute PublicWorkspaceFilterRequestDto filters) {
        return success(calendars.calendar(from, to, workspaceId, filters));
    }
}
