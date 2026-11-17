package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.PublicWorkspaceFilterRequestDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto;
import base.api.feature.workspace.dto.response.WorkspaceSuggestionsResponseDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IMediaRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.repository.WorkspaceDistanceProjection;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ReviewStatus;
import base.api.shared.enums.UserStatus;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkspaceServiceImpl implements IWorkspaceService {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id", "name", "createdAt", "updatedAt", "status", "city", "district", "category"
    );

    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;
    private final IBookingRepository bookingRepository;
    private final base.api.feature.resource.service.BuildingService buildings;
    private final ICustomerReviewRepository customerReviewRepository;
    private final IBookableResourceRepository bookableResourceRepository;
    private final IMediaRepository mediaRepository;

    public WorkspaceServiceImpl(
            IWorkspaceRepository workspaceRepository,
            IUserRepository userRepository,
            IWorkspaceOperatingHourRepository operatingHourRepository,
            IBookingRepository bookingRepository,
            base.api.feature.resource.service.BuildingService buildings) {
        this(workspaceRepository, userRepository, operatingHourRepository, bookingRepository, buildings, null, null, null);
    }

    @Autowired
    public WorkspaceServiceImpl(
            IWorkspaceRepository workspaceRepository,
            IUserRepository userRepository,
            IWorkspaceOperatingHourRepository operatingHourRepository,
            IBookingRepository bookingRepository,
            base.api.feature.resource.service.BuildingService buildings,
            ICustomerReviewRepository customerReviewRepository,
            IBookableResourceRepository bookableResourceRepository,
            IMediaRepository mediaRepository) {
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.operatingHourRepository = operatingHourRepository;
        this.bookingRepository = bookingRepository;
        this.buildings = buildings;
        this.customerReviewRepository = customerReviewRepository;
        this.bookableResourceRepository = bookableResourceRepository;
        this.mediaRepository = mediaRepository;
    }

    @Override
    public WorkspaceDetailDto createWorkspace(Long organizerId, CreateWorkspaceDto dto) {
        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));

        WorkspaceModel workspace = WorkspaceMapper.toModel(dto, organizer);
        workspace.setStatus(WorkspaceStatus.DRAFT);

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        return WorkspaceMapper.toDetailDto(saved, hours);
    }

    @Override
    public WorkspaceDetailDto updateWorkspace(Long organizerId, Long workspaceId, UpdateWorkspaceDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense: Không thuộc quyền sở hữu ném 404 thay vì 403
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            throw new BadRequestException("Không thể cập nhật không gian làm việc đã bị lưu trữ");
        }

        buildings.syncWorkspaceLocation(workspace, false);
        if (dto.getName() != null && !dto.getName().isBlank()) {
            workspace.setName(dto.getName());
        }
        if (dto.getCategory() != null) {
            workspace.setCategory(dto.getCategory());
        }
        if (dto.getDescription() != null) {
            workspace.setDescription(dto.getDescription());
        }
        // Ignore legacy client location fields: the linked building is authoritative.
        if (dto.getAreaSqm() != null) {
            workspace.setAreaSqm(dto.getAreaSqm());
        }
        if (dto.getSupportPhone() != null) {
            workspace.setSupportPhone(dto.getSupportPhone());
        }
        if (dto.getEntryInstructions() != null) {
            workspace.setEntryInstructions(dto.getEntryInstructions());
        }
        if (dto.getBookingConfirmationMode() != null) {
            workspace.setBookingConfirmationMode(dto.getBookingConfirmationMode());
        }

        WorkspaceModel updated = workspaceRepository.save(workspace);
        return WorkspaceMapper.toDetailDto(updated);
    }

    @Override
    public WorkspaceDetailDto archiveWorkspace(Long organizerId, Long workspaceId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            return WorkspaceMapper.toDetailDto(workspace);
        }

        workspace.setStatus(WorkspaceStatus.ARCHIVED);
        WorkspaceModel archived = workspaceRepository.save(workspace);
        return WorkspaceMapper.toDetailDto(archived);
    }

    @Override
    public WorkspaceDetailDto updateLifecycle(Long organizerId, Long workspaceId, WorkspaceLifecycleDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (dto.getAction() == null) {
            throw new BadRequestException("Hành động vòng đời không hợp lệ");
        }

        switch (dto.getAction()) {
            case ARCHIVE -> workspace.setStatus(WorkspaceStatus.ARCHIVED);
            case DRAFT -> {
                if (workspace.getStatus() == WorkspaceStatus.SUSPENDED || workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
                    throw new ConflictException("Không thể chuyển về bản nháp từ trạng thái: " + workspace.getStatus());
                }
                workspace.setStatus(WorkspaceStatus.DRAFT);
            }
            case PENDING, PAUSE -> {
                if (workspace.getStatus() == WorkspaceStatus.SUSPENDED || workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
                    throw new ConflictException("Không thể chuyển sang trạng thái chờ xử lý từ trạng thái: " + workspace.getStatus());
                }
                if (dto.getAction() == base.api.shared.enums.WorkspaceLifecycleAction.PAUSE
                        && workspace.getStatus() != WorkspaceStatus.ACTIVE
                        && workspace.getStatus() != WorkspaceStatus.MAINTENANCE) {
                    throw new ConflictException("Chỉ có thể tạm dừng không gian đang hoạt động (ACTIVE) hoặc bảo trì (MAINTENANCE)");
                }
                workspace.setStatus(WorkspaceStatus.PENDING);
                if (workspace.getSubmittedAt() == null) {
                    workspace.setSubmittedAt(LocalDateTime.now());
                }
            }
            case ACTIVATE, RESUME -> {
                if (workspace.getStatus() == WorkspaceStatus.SUSPENDED || workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
                    throw new ConflictException("Không thể kích hoạt không gian ở trạng thái: " + workspace.getStatus());
                }
                if (dto.getAction() == base.api.shared.enums.WorkspaceLifecycleAction.RESUME
                        && workspace.getStatus() != WorkspaceStatus.PENDING
                        && workspace.getStatus() != WorkspaceStatus.MAINTENANCE
                        && workspace.getStatus() != WorkspaceStatus.INACTIVE) {
                    throw new ConflictException("Chỉ có thể mở lại không gian đang ở trạng thái PENDING hoặc MAINTENANCE");
                }
                validateRequiredFieldsForActivation(workspace);
                LocalDateTime now = LocalDateTime.now();
                workspace.setStatus(WorkspaceStatus.ACTIVE);
                if (workspace.getSubmittedAt() == null) {
                    workspace.setSubmittedAt(now);
                }
                if (workspace.getReviewedAt() == null) {
                    workspace.setReviewedAt(now);
                }
                workspace.setReviewFeedback(null);
            }
            case MAINTENANCE -> {
                if (workspace.getStatus() != WorkspaceStatus.ACTIVE
                        && workspace.getStatus() != WorkspaceStatus.PENDING
                        && workspace.getStatus() != WorkspaceStatus.MAINTENANCE
                        && workspace.getStatus() != WorkspaceStatus.INACTIVE) {
                    throw new ConflictException("Không thể bảo trì không gian có trạng thái: " + workspace.getStatus());
                }
                workspace.setStatus(WorkspaceStatus.MAINTENANCE);
            }
        }

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        long bookingCount = saved.getId() != null ? bookingRepository.countByWorkspaceId(saved.getId()) : 0L;
        return WorkspaceMapper.toDetailDto(saved, hours, bookingCount);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getMyWorkspaces(Long organizerId, WorkspaceStatus status, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)
                : PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        String search = pageRequest != null ? pageRequest.normalizedSearch() : null;

        Page<WorkspaceModel> page = workspaceRepository.searchByOrganizer(organizerId, status, search, pageable);
        Map<Long, Long> bookingCounts = getBookingCountsForPage(page.getContent());
        return page.map(w -> WorkspaceMapper.toDto(w, null, bookingCounts.getOrDefault(w.getId(), 0L)));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceDetailDto getWorkspaceDetail(Long organizerId, Long workspaceId) {
        WorkspaceModel workspace;
        if (organizerId != null) {
            workspace = workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
        long bookingCount = workspace.getId() != null ? bookingRepository.countByWorkspaceId(workspace.getId()) : 0L;
        return WorkspaceMapper.toDetailDto(workspace, hours, bookingCount);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceDetailDto getPublicWorkspaceDetail(Long workspaceId) {
        WorkspaceModel workspace = workspaceRepository.findByIdAndStatus(workspaceId, WorkspaceStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc không gian chưa được kích hoạt"));
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
        return WorkspaceMapper.toDetailDto(workspace, hours);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getPublicWorkspaces(PublicWorkspaceFilterRequestDto filterRequest) {
        String search = filterRequest != null ? filterRequest.normalizedSearch() : null;
        String sortBy = filterRequest != null && filterRequest.getSortBy() != null ? filterRequest.getSortBy().trim() : null;
        String sortDir = filterRequest != null && filterRequest.getSortDir() != null ? filterRequest.getSortDir().trim() : "desc";
        int pageNumber = filterRequest != null && filterRequest.getPage() > 0 ? filterRequest.getPage() - 1 : 0;
        int pageSize = filterRequest != null ? filterRequest.getSize() : 20;

        String city = filterRequest != null && filterRequest.getCity() != null && !filterRequest.getCity().isBlank() ? filterRequest.getCity().trim() : null;
        String district = filterRequest != null && filterRequest.getDistrict() != null && !filterRequest.getDistrict().isBlank() ? filterRequest.getDistrict().trim() : null;
        WorkspaceCategory category = filterRequest != null ? filterRequest.getCategory() : null;
        java.math.BigDecimal minPrice = filterRequest != null ? filterRequest.getMinPrice() : null;
        java.math.BigDecimal maxPrice = filterRequest != null ? filterRequest.getMaxPrice() : null;
        Double minRating = filterRequest != null ? filterRequest.getMinRating() : null;

        List<Long> amenityIds = filterRequest != null && filterRequest.getAmenityIds() != null && !filterRequest.getAmenityIds().isEmpty()
                ? filterRequest.getAmenityIds()
                : List.of(-1L);
        boolean hasAmenityFilter = filterRequest != null && filterRequest.getAmenityIds() != null && !filterRequest.getAmenityIds().isEmpty();
        Long amenityCount = hasAmenityFilter ? (long) filterRequest.getAmenityIds().size() : 0L;

        List<ResourceCategory> resourceCats = filterRequest != null && filterRequest.getResourceCategories() != null && !filterRequest.getResourceCategories().isEmpty()
                ? filterRequest.getResourceCategories()
                : List.of(ResourceCategory.DESK);
        boolean hasResourceCatFilter = filterRequest != null && filterRequest.getResourceCategories() != null && !filterRequest.getResourceCategories().isEmpty();

        boolean hasFilters = (city != null || district != null || category != null || minPrice != null || maxPrice != null || hasAmenityFilter || hasResourceCatFilter || minRating != null);

        Page<WorkspaceModel> page;
        if ("pricePerHour".equalsIgnoreCase(sortBy) || "price".equalsIgnoreCase(sortBy)) {
            Pageable pageable = PageRequest.of(pageNumber, pageSize);
            if ("asc".equalsIgnoreCase(sortDir)) {
                page = hasFilters
                        ? workspaceRepository.filterPublicOrderByPriceAsc(
                                WorkspaceStatus.ACTIVE, search, city, district, category, minPrice, maxPrice,
                                hasAmenityFilter, amenityIds, amenityCount,
                                hasResourceCatFilter, resourceCats, minRating, pageable)
                        : workspaceRepository.searchPublicOrderByPriceAsc(WorkspaceStatus.ACTIVE, search, pageable);
            } else {
                page = hasFilters
                        ? workspaceRepository.filterPublicOrderByPriceDesc(
                                WorkspaceStatus.ACTIVE, search, city, district, category, minPrice, maxPrice,
                                hasAmenityFilter, amenityIds, amenityCount,
                                hasResourceCatFilter, resourceCats, minRating, pageable)
                        : workspaceRepository.searchPublicOrderByPriceDesc(WorkspaceStatus.ACTIVE, search, pageable);
            }
        } else if ("rating".equalsIgnoreCase(sortBy)) {
            Pageable pageable = PageRequest.of(pageNumber, pageSize);
            page = hasFilters
                    ? workspaceRepository.filterPublicOrderByRatingDesc(
                            WorkspaceStatus.ACTIVE, search, city, district, category, minPrice, maxPrice,
                            hasAmenityFilter, amenityIds, amenityCount,
                            hasResourceCatFilter, resourceCats, minRating, pageable)
                    : workspaceRepository.searchPublicOrderByRatingDesc(WorkspaceStatus.ACTIVE, search, pageable);
        } else if ("popular".equalsIgnoreCase(sortBy) || "totalBookings".equalsIgnoreCase(sortBy) || "bookingCount".equalsIgnoreCase(sortBy)) {
            Pageable pageable = PageRequest.of(pageNumber, pageSize);
            page = hasFilters
                    ? workspaceRepository.filterPublicOrderByPopular(
                            WorkspaceStatus.ACTIVE, search, city, district, category, minPrice, maxPrice,
                            hasAmenityFilter, amenityIds, amenityCount,
                            hasResourceCatFilter, resourceCats, minRating, pageable)
                    : workspaceRepository.searchPublicOrderByPopular(WorkspaceStatus.ACTIVE, search, pageable);
        } else {
            Pageable pageable = filterRequest != null
                    ? filterRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)
                    : PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
            page = hasFilters
                    ? workspaceRepository.filterPublic(
                            WorkspaceStatus.ACTIVE, search, city, district, category, minPrice, maxPrice,
                            hasAmenityFilter, amenityIds, amenityCount,
                            hasResourceCatFilter, resourceCats, minRating, pageable)
                    : workspaceRepository.searchPublic(WorkspaceStatus.ACTIVE, search, pageable);
        }

        List<WorkspaceModel> workspaces = page.getContent();
        Map<Long, Long> bookingCounts = getBookingCountsForPage(workspaces);
        Map<Long, RatingSummary> ratingSummaries = getRatingsForPage(workspaces);
        Map<Long, java.math.BigDecimal> minPrices = getStartingPricesForPage(workspaces);
        Map<Long, String> coverUrls = getCoverUrlsForPage(workspaces);

        return page.map(w -> {
            Long bCount = bookingCounts.getOrDefault(w.getId(), 0L);
            RatingSummary rSummary = ratingSummaries.get(w.getId());
            java.math.BigDecimal price = minPrices.get(w.getId());
            String coverUrl = coverUrls.get(w.getId());
            return WorkspaceMapper.toDto(
                    w,
                    null,
                    bCount,
                    price,
                    rSummary != null ? rSummary.avgRating() : null,
                    rSummary != null ? rSummary.reviewCount() : 0L,
                    coverUrl);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getPublicWorkspaces(PageRequestDTO pageRequest) {
        if (pageRequest instanceof PublicWorkspaceFilterRequestDto dto) {
            return getPublicWorkspaces(dto);
        }
        PublicWorkspaceFilterRequestDto dto = new PublicWorkspaceFilterRequestDto();
        if (pageRequest != null) {
            dto.setPage(pageRequest.getPage());
            dto.setSize(pageRequest.getSize());
            dto.setSortBy(pageRequest.getSortBy());
            dto.setSortDir(pageRequest.getSortDir());
            dto.setSearch(pageRequest.getSearch());
        }
        return getPublicWorkspaces(dto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> findNearbyWorkspaces(Double lat, Double lng, Double radiusKm, PageRequestDTO pageRequest) {
        if (lat == null || lat < -90.0 || lat > 90.0) {
            throw new BadRequestException("Tọa độ vĩ độ (lat) không hợp lệ, phải nằm trong khoảng [-90.0, 90.0]");
        }
        if (lng == null || lng < -180.0 || lng > 180.0) {
            throw new BadRequestException("Tọa độ kinh độ (lng) không hợp lệ, phải nằm trong khoảng [-180.0, 180.0]");
        }

        double effectiveRadius = radiusKm != null ? radiusKm : 10.0;
        if (effectiveRadius < 0.5 || effectiveRadius > 50.0) {
            throw new BadRequestException("Bán kính tìm kiếm (radiusKm) phải từ 0.5 km đến 50.0 km");
        }

        int pageNumber = pageRequest != null && pageRequest.getPage() > 0
                ? pageRequest.getPage() - 1
                : 0;
        int pageSize = pageRequest != null && pageRequest.getSize() > 0
                ? Math.min(pageRequest.getSize(), 100)
                : 20;
        Pageable pageable = PageRequest.of(pageNumber, pageSize);

        Page<WorkspaceDistanceProjection> projectionPage = workspaceRepository.findNearbyWorkspaceIds(lat, lng, effectiveRadius, pageable);
        if (projectionPage.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, projectionPage.getTotalElements());
        }

        List<Long> ids = projectionPage.getContent().stream()
                .map(WorkspaceDistanceProjection::getId)
                .toList();

        Map<Long, WorkspaceModel> workspaceMap = workspaceRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(WorkspaceModel::getId, w -> w));

        List<WorkspaceModel> models = workspaceMap.values().stream().filter(Objects::nonNull).toList();
        Map<Long, Long> bookingCounts = getBookingCountsForPage(models);
        Map<Long, RatingSummary> ratingSummaries = getRatingsForPage(models);
        Map<Long, java.math.BigDecimal> minPrices = getStartingPricesForPage(models);
        Map<Long, String> coverUrls = getCoverUrlsForPage(models);

        List<WorkspaceDto> dtos = projectionPage.getContent().stream()
                .map(proj -> {
                    WorkspaceModel model = workspaceMap.get(proj.getId());
                    if (model == null) return null;
                    Long bCount = bookingCounts.getOrDefault(model.getId(), 0L);
                    RatingSummary rSummary = ratingSummaries.get(model.getId());
                    java.math.BigDecimal price = minPrices.get(model.getId());
                    String coverUrl = coverUrls.get(model.getId());
                    return WorkspaceMapper.toDto(
                            model,
                            proj.getDistanceKm(),
                            bCount,
                            price,
                            rSummary != null ? rSummary.avgRating() : null,
                            rSummary != null ? rSummary.reviewCount() : 0L,
                            coverUrl);
                })
                .filter(Objects::nonNull)
                .toList();

        return new PageImpl<>(dtos, pageable, projectionPage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceSuggestionsResponseDto getSearchSuggestions(String query) {
        if (query == null || query.trim().length() < 2) {
            return WorkspaceSuggestionsResponseDto.builder()
                    .workspaces(Collections.emptyList())
                    .locations(Collections.emptyList())
                    .categories(Collections.emptyList())
                    .build();
        }

        String cleanQuery = query.trim();

        // 1. Top 5 Matching Workspaces
        List<WorkspaceModel> workspaces = workspaceRepository.findTopSuggestions(
                WorkspaceStatus.ACTIVE, cleanQuery, PageRequest.of(0, 5));
        Map<Long, RatingSummary> ratingSummaries = getRatingsForPage(workspaces);
        Map<Long, java.math.BigDecimal> minPrices = getStartingPricesForPage(workspaces);
        Map<Long, String> coverUrls = getCoverUrlsForPage(workspaces);

        List<WorkspaceSuggestionsResponseDto.WorkspaceItemSuggestion> workspaceSuggestions = workspaces.stream()
                .map(w -> {
                    RatingSummary rSummary = ratingSummaries.get(w.getId());
                    return WorkspaceSuggestionsResponseDto.WorkspaceItemSuggestion.builder()
                            .id(w.getId())
                            .name(w.getName())
                            .address(w.getAddress())
                            .district(w.getDistrict())
                            .city(w.getCity())
                            .category(w.getCategory())
                            .coverImageUrl(coverUrls.get(w.getId()))
                            .pricePerHour(minPrices.get(w.getId()))
                            .rating(rSummary != null ? rSummary.avgRating() : null)
                            .build();
                })
                .toList();

        // 2. Locations (Districts and Cities, max 3)
        List<WorkspaceSuggestionsResponseDto.LocationSuggestion> locationSuggestions = new ArrayList<>();
        List<Object[]> districtRows = workspaceRepository.findDistinctDistrictsMatching(
                WorkspaceStatus.ACTIVE, cleanQuery, PageRequest.of(0, 3));
        for (Object[] row : districtRows) {
            String district = (String) row[0];
            String city = row.length > 1 ? (String) row[1] : null;
            String label = district + (city != null && !city.isBlank() ? ", " + city : "");
            locationSuggestions.add(WorkspaceSuggestionsResponseDto.LocationSuggestion.builder()
                    .label(label)
                    .type("DISTRICT")
                    .city(city)
                    .district(district)
                    .build());
        }

        if (locationSuggestions.size() < 3) {
            int remaining = 3 - locationSuggestions.size();
            List<String> cities = workspaceRepository.findDistinctCitiesMatching(
                    WorkspaceStatus.ACTIVE, cleanQuery, PageRequest.of(0, remaining));
            for (String city : cities) {
                boolean exists = locationSuggestions.stream().anyMatch(l -> city.equalsIgnoreCase(l.getCity()) && l.getDistrict() == null);
                if (!exists) {
                    locationSuggestions.add(WorkspaceSuggestionsResponseDto.LocationSuggestion.builder()
                            .label(city)
                            .type("CITY")
                            .city(city)
                            .district(null)
                            .build());
                }
            }
        }

        // 3. Category Suggestions (Max 3)
        List<WorkspaceSuggestionsResponseDto.CategorySuggestion> categorySuggestions = new ArrayList<>();
        String lowerQuery = cleanQuery.toLowerCase();
        Map<WorkspaceCategory, String[]> categoryMeta = Map.of(
                WorkspaceCategory.COWORKING_HUB, new String[]{"Coworking Hub", "Không gian làm việc chung, bàn làm việc linh hoạt", "coworking, hub, linh hoat, bàn làm việc"},
                WorkspaceCategory.BUSINESS_LOUNGE, new String[]{"Business Lounge", "Phòng chờ doanh nhân đẳng cấp, yên tĩnh", "lounge, doanh nhan, yên tĩnh, cafe"},
                WorkspaceCategory.CREATIVE_STUDIO, new String[]{"Creative Studio", "Studio sáng tạo, podcast booth, chụp ảnh", "studio, sang tao, podcast, media, quay phim"},
                WorkspaceCategory.SERVICED_OFFICE, new String[]{"Serviced Office", "Văn phòng dịch vụ trọn gói riêng tư", "office, van phong, tron goi, phong rieng"}
        );

        for (Map.Entry<WorkspaceCategory, String[]> entry : categoryMeta.entrySet()) {
            WorkspaceCategory cat = entry.getKey();
            String[] meta = entry.getValue();
            String name = cat.name().toLowerCase();
            String label = meta[0];
            String desc = meta[1];
            String keywords = meta[2];

            if (name.contains(lowerQuery) || label.toLowerCase().contains(lowerQuery) || desc.toLowerCase().contains(lowerQuery) || keywords.contains(lowerQuery)) {
                categorySuggestions.add(WorkspaceSuggestionsResponseDto.CategorySuggestion.builder()
                        .category(cat)
                        .label(label)
                        .description(desc)
                        .build());
                if (categorySuggestions.size() >= 3) break;
            }
        }

        return WorkspaceSuggestionsResponseDto.builder()
                .workspaces(workspaceSuggestions)
                .locations(locationSuggestions)
                .categories(categorySuggestions)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceOperatingHourDto> getOperatingHours(Long organizerId, Long workspaceId) {
        if (organizerId != null) {
            workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }
        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId)
                .stream()
                .map(WorkspaceMapper::toOperatingHourDto)
                .toList();
    }

    @Override
    public List<WorkspaceOperatingHourDto> updateOperatingHours(
            Long organizerId,
            Long workspaceId,
            List<WorkspaceOperatingHourDto> dtos) {
        WorkspaceModel workspace;
        if (organizerId != null) {
            workspace = workspaceRepository.findByIdAndOrganizerId(workspaceId, organizerId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc bạn không có quyền truy cập"));
        } else {
            workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc"));
        }

        if (workspace.getStatus() == WorkspaceStatus.ARCHIVED) {
            throw new BadRequestException("Không thể cấu hình giờ hoạt động cho không gian đã lưu trữ");
        }

        List<WorkspaceOperatingHourModel> savedHours = saveOperatingHoursInternal(workspace, dtos);
        return savedHours.stream().map(WorkspaceMapper::toOperatingHourDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceOperatingHourDto> getPublicOperatingHours(Long workspaceId) {
        workspaceRepository.findByIdAndStatus(workspaceId, WorkspaceStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc hoặc không gian chưa được kích hoạt"));

        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspaceId)
                .stream()
                .map(WorkspaceMapper::toOperatingHourDto)
                .toList();
    }

    private List<WorkspaceOperatingHourModel> saveOperatingHoursInternal(
            WorkspaceModel workspace,
            List<WorkspaceOperatingHourDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Integer> seenDays = new HashSet<>();
        List<WorkspaceOperatingHourModel> models = new ArrayList<>();

        for (WorkspaceOperatingHourDto dto : dtos) {
            if (dto.getDayOfWeek() == null || dto.getDayOfWeek() < 1 || dto.getDayOfWeek() > 7) {
                throw new BadRequestException("Thứ trong tuần phải từ 1 (Thứ Hai) đến 7 (Chủ Nhật)");
            }
            if (!seenDays.add(dto.getDayOfWeek())) {
                throw new BadRequestException("Trùng lặp cấu hình cho thứ " + dto.getDayOfWeek());
            }

            if (!dto.isClosed() && !dto.is24Hours()) {
                if (dto.getOpenTime() == null || dto.getCloseTime() == null) {
                    throw new BadRequestException("Vui lòng nhập đầy đủ giờ mở cửa và đóng cửa cho thứ " + dto.getDayOfWeek());
                }
                if (!dto.getCloseTime().isAfter(dto.getOpenTime())) {
                    throw new BadRequestException("Giờ đóng cửa (" + dto.getCloseTime() + ") phải sau giờ mở cửa (" + dto.getOpenTime() + ") cho thứ " + dto.getDayOfWeek());
                }
            }

            models.add(WorkspaceMapper.toOperatingHourModel(dto, workspace));
        }

        operatingHourRepository.saveAll(models);
        return operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
    }

    @Override
    public WorkspaceDetailDto submitWorkspace(Long organizerId, Long workspaceId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Strict Ownership Defense
        if (workspace.getOrganizer() == null || !workspace.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        if (workspace.getStatus() != WorkspaceStatus.DRAFT
                && workspace.getStatus() != WorkspaceStatus.PENDING
                && workspace.getStatus() != WorkspaceStatus.MAINTENANCE) {
            throw new ConflictException("Chỉ có thể đăng kích hoạt không gian ở trạng thái DRAFT, PENDING hoặc MAINTENANCE (trạng thái hiện tại: " + workspace.getStatus() + ")");
        }

        validateRequiredFieldsForActivation(workspace);

        LocalDateTime now = LocalDateTime.now();
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        workspace.setSubmittedAt(now);
        workspace.setReviewedAt(now);
        workspace.setReviewFeedback(null);

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        long bookingCount = saved.getId() != null ? bookingRepository.countByWorkspaceId(saved.getId()) : 0L;
        return WorkspaceMapper.toDetailDto(saved, hours, bookingCount);
    }

    private void validateRequiredFieldsForActivation(WorkspaceModel workspace) {
        buildings.syncWorkspaceLocation(workspace, true);
        if (workspace.getName() == null || workspace.getName().isBlank()) {
            throw new BadRequestException("Tên không gian làm việc không được để trống khi đăng lên hệ thống");
        }
        if (workspace.getCategory() == null) {
            throw new BadRequestException("Danh mục không gian làm việc không được để trống khi đăng lên hệ thống");
        }
        if (workspace.getAddress() == null || workspace.getAddress().isBlank()) {
            throw new BadRequestException("Địa chỉ không gian làm việc không được để trống khi đăng lên hệ thống");
        }
        if (workspace.getCity() == null || workspace.getCity().isBlank()) {
            throw new BadRequestException("Thành phố không được để trống khi đăng lên hệ thống");
        }
    }

    @Override
    public WorkspaceDetailDto adminModerateWorkspace(Long adminId, Long workspaceId, AdminModerationWorkspaceDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        if ("Suspended".equalsIgnoreCase(dto.getModerationStatus())) {
            if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
                throw new ConflictException("Chỉ có thể đình chỉ không gian đang hoạt động (ACTIVE)");
            }
            if (dto.getReason() == null || dto.getReason().trim().length() < 5) {
                throw new BadRequestException("Lý do đình chỉ phải có ít nhất 5 ký tự");
            }
            workspace.setStatus(WorkspaceStatus.SUSPENDED);
            workspace.setReviewFeedback(dto.getReason().trim());
        } else if ("Normal".equalsIgnoreCase(dto.getModerationStatus())) {
            if (workspace.getStatus() != WorkspaceStatus.SUSPENDED) {
                throw new ConflictException("Chỉ có thể khôi phục không gian đang bị đình chỉ (SUSPENDED)");
            }
            workspace.setStatus(WorkspaceStatus.ACTIVE);
            workspace.setReviewFeedback(null);
        } else {
            throw new BadRequestException("moderationStatus không hợp lệ (chỉ chấp nhận 'Suspended' hoặc 'Normal')");
        }

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        long bookingCount = saved.getId() != null ? bookingRepository.countByWorkspaceId(saved.getId()) : 0L;
        return WorkspaceMapper.toDetailDto(saved, hours, bookingCount);
    }

    @Override
    public WorkspaceDetailDto adminSetFeatured(Long adminId, Long workspaceId, AdminFeaturedWorkspaceDto dto) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        if (Boolean.TRUE.equals(dto.getIsFeatured())) {
            // USER RULE 3: Workspace PHẢI ở trạng thái ACTIVE mới được ghim nổi bật!
            if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
                throw new ConflictException("Chỉ có thể đánh dấu nổi bật không gian đang hoạt động (ACTIVE)");
            }
            workspace.setFeaturedOrder(dto.getFeaturedOrder() != null && dto.getFeaturedOrder() > 0 ? dto.getFeaturedOrder() : 1);
            workspace.setFeaturedUntil(dto.getFeaturedUntil());
        } else {
            workspace.setFeaturedOrder(null);
            workspace.setFeaturedUntil(null);
        }

        WorkspaceModel saved = workspaceRepository.save(workspace);
        List<WorkspaceOperatingHourModel> hours = operatingHourRepository.findByWorkspaceIdOrderByDayOfWeekAsc(saved.getId());
        long bookingCount = saved.getId() != null ? bookingRepository.countByWorkspaceId(saved.getId()) : 0L;
        return WorkspaceMapper.toDetailDto(saved, hours, bookingCount);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WorkspaceDto> getAdminWorkspaces(WorkspaceStatus status, String city, String search, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)
                : PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));

        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanCity = (city != null && !city.isBlank()) ? city.trim() : null;

        Page<WorkspaceModel> page = workspaceRepository.searchAdmin(status, cleanCity, cleanSearch, pageable);
        Map<Long, Long> bookingCounts = getBookingCountsForPage(page.getContent());
        return page.map(w -> WorkspaceMapper.toDto(w, null, bookingCounts.getOrDefault(w.getId(), 0L)));
    }

    @Override
    @Transactional(readOnly = true)
    public AdminWorkspaceKpisDto getAdminWorkspaceKpis() {
        long totalUsers = userRepository.count();
        long activeOrganizers = userRepository.countByRoleNameAndStatus("ORGANIZER", UserStatus.ACTIVE);
        long totalWorkspaces = workspaceRepository.count();
        long activeWorkspaces = workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE);
        long pendingCount = workspaceRepository.countByStatus(WorkspaceStatus.PENDING);
        long maintenanceCount = workspaceRepository.countByStatus(WorkspaceStatus.MAINTENANCE);
        long draftCount = workspaceRepository.countByStatus(WorkspaceStatus.DRAFT);
        long suspendedCount = workspaceRepository.countByStatus(WorkspaceStatus.SUSPENDED);
        long totalBookings = bookingRepository.count();

        return AdminWorkspaceKpisDto.builder()
                .totalPlatformUsers(totalUsers)
                .activeOrganizers(activeOrganizers)
                .activeWorkspaces(activeWorkspaces)
                .totalBookings(totalBookings)
                .totalWorkspaces(totalWorkspaces)
                .activeCount(activeWorkspaces)
                .pendingCount(pendingCount)
                .maintenanceCount(maintenanceCount)
                .draftCount(draftCount)
                .suspendedCount(suspendedCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceDto> getFeaturedWorkspaces() {
        List<WorkspaceModel> featured = workspaceRepository.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE);
        Map<Long, Long> bookingCounts = getBookingCountsForPage(featured);
        Map<Long, RatingSummary> ratingSummaries = getRatingsForPage(featured);
        Map<Long, java.math.BigDecimal> minPrices = getStartingPricesForPage(featured);
        Map<Long, String> coverUrls = getCoverUrlsForPage(featured);

        return featured.stream()
                .map(w -> {
                    Long bCount = bookingCounts.getOrDefault(w.getId(), 0L);
                    RatingSummary rSummary = ratingSummaries.get(w.getId());
                    java.math.BigDecimal price = minPrices.get(w.getId());
                    String coverUrl = coverUrls.get(w.getId());
                    return WorkspaceMapper.toDto(
                            w,
                            null,
                            bCount,
                            price,
                            rSummary != null ? rSummary.avgRating() : null,
                            rSummary != null ? rSummary.reviewCount() : 0L,
                            coverUrl);
                })
                .toList();
    }

    private record RatingSummary(Double avgRating, Long reviewCount) {}

    private Map<Long, RatingSummary> getRatingsForPage(Collection<WorkspaceModel> workspaces) {
        if (customerReviewRepository == null || workspaces == null || workspaces.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = workspaces.stream()
                .map(WorkspaceModel::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = customerReviewRepository.findRatingSummariesByWorkspaceIds(ids, ReviewStatus.PUBLISHED);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, RatingSummary> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 3 && row[0] instanceof Number wsId) {
                Double avg = row[1] instanceof Number n ? n.doubleValue() : null;
                Long cnt = row[2] instanceof Number n ? n.longValue() : 0L;
                map.put(wsId.longValue(), new RatingSummary(avg, cnt));
            }
        }
        return map;
    }

    private Map<Long, java.math.BigDecimal> getStartingPricesForPage(Collection<WorkspaceModel> workspaces) {
        if (bookableResourceRepository == null || workspaces == null || workspaces.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = workspaces.stream()
                .map(WorkspaceModel::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = bookableResourceRepository.findMinPricePerHourByWorkspaceIds(ids, BookableResourceStatus.ACTIVE);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, java.math.BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number wsId && row[1] instanceof java.math.BigDecimal price) {
                map.put(wsId.longValue(), price);
            }
        }
        return map;
    }

    private Map<Long, String> getCoverUrlsForPage(Collection<WorkspaceModel> workspaces) {
        if (mediaRepository == null || workspaces == null || workspaces.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = workspaces.stream()
                .map(WorkspaceModel::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = mediaRepository.findCoverUrlsByWorkspaceIds(ids);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, String> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number wsId && row[1] instanceof String url) {
                map.putIfAbsent(wsId.longValue(), url);
            }
        }
        return map;
    }

    private Map<Long, Long> getBookingCountsForPage(Collection<WorkspaceModel> workspaces) {
        if (workspaces == null || workspaces.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = workspaces.stream()
                .map(WorkspaceModel::getId)
                .filter(Objects::nonNull)
                .toList();
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = bookingRepository.countBookingsByWorkspaceIds(ids);
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] instanceof Number wsId && row[1] instanceof Number cnt) {
                counts.put(wsId.longValue(), cnt.longValue());
            }
        }
        return counts;
    }
}
