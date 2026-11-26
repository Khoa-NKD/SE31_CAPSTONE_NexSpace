package base.api.feature.chatbot.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.chatbot.service.NexBotQueryParser.ParsedQuery;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.personalization.repository.ICustomerPreferenceRepository;
import base.api.feature.personalization.repository.IFavoriteWorkspaceRepository;
import base.api.feature.personalization.repository.ISavedSearchFilterRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.pricing.service.BookingBaseRates;
import base.api.feature.pricing.service.PricingAdjustments;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceTypeRepository;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.resource.service.ResourceMaintenance;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.workspace.dto.response.CancellationRuleDto;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.CancellationPolicies;
import base.api.feature.workspace.service.OperatingHours;
import base.api.feature.workspace.service.VietnamHolidays;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.personalization.CustomerPreferenceModel;
import base.api.shared.entity.personalization.SavedSearchFilterModel;
import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.PriceType;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.ReviewStatus;
import base.api.shared.enums.WorkspaceStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Queries live, read-only, non-sensitive NexSpace data (workspaces, prices, ratings,
 * operating hours, holidays, real-time occupancy, pricing rules, and authenticated user state)
 * to ground both Gemini prompts and the deterministic fallback engine.
 */
@Slf4j
@Service
public class NexBotContextGrounder {

    private static final int MAX_WORKSPACES_IN_CONTEXT = 8;
    private static final int MAX_FOCUSED_RESOURCES = 12;
    private static final int MAX_MATCHED_OPTIONS = 8;
    private static final int MAX_RECENT_BOOKINGS = 5;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final DateTimeFormatter HOUR_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final IWorkspaceRepository workspaceRepository;
    private final IBookableResourceRepository resourceRepository;
    private final IResourceTypeRepository resourceTypeRepository;
    private final IWorkspaceOperatingHourRepository operatingHourRepository;
    private final IWorkspaceAmenityRepository workspaceAmenityRepository;
    private final IWorkspaceCancellationRuleRepository cancellationRuleRepository;
    private final IPlatformSettingRepository platformSettingRepository;
    private final IUserRepository userRepository;
    private final IBookingRepository bookingRepository;
    private final IOrganizerProfileRepository organizerProfileRepository;

    @Autowired(required = false)
    private ResourceUsageRepository resourceUsageRepository;

    @Autowired(required = false)
    private ICustomerReviewRepository customerReviewRepository;

    @Autowired(required = false)
    private IPricingRuleRepository pricingRuleRepository;

    @Autowired(required = false)
    private ICustomerPreferenceRepository customerPreferenceRepository;

    @Autowired(required = false)
    private IFavoriteWorkspaceRepository favoriteWorkspaceRepository;

    @Autowired(required = false)
    private ISavedSearchFilterRepository savedSearchFilterRepository;

    @Value("${app.booking.max-hold-lifetime-minutes:15}")
    private int maxHoldLifetimeMinutes = 15;

    @Value("${app.booking.rehold-cooldown-seconds:30}")
    private int reholdCooldownSeconds = 30;

    @Value("${app.booking.spam-hold.threshold:3}")
    private int defaultSpamThreshold = 3;

    @Value("${app.booking.spam-hold.block-duration-minutes:20}")
    private int defaultSpamBlockMinutes = 20;

    public NexBotContextGrounder() {
        this(null, null, null, null, null, null, null, null, null, null);
    }

    public NexBotContextGrounder(IWorkspaceRepository workspaceRepository) {
        this(workspaceRepository, null, null, null, null, null, null, null, null, null);
    }

    @Autowired
    public NexBotContextGrounder(
            @Autowired(required = false) IWorkspaceRepository workspaceRepository,
            @Autowired(required = false) IBookableResourceRepository resourceRepository,
            @Autowired(required = false) IResourceTypeRepository resourceTypeRepository,
            @Autowired(required = false) IWorkspaceOperatingHourRepository operatingHourRepository,
            @Autowired(required = false) IWorkspaceAmenityRepository workspaceAmenityRepository,
            @Autowired(required = false) IWorkspaceCancellationRuleRepository cancellationRuleRepository,
            @Autowired(required = false) IPlatformSettingRepository platformSettingRepository,
            @Autowired(required = false) IUserRepository userRepository,
            @Autowired(required = false) IBookingRepository bookingRepository,
            @Autowired(required = false) IOrganizerProfileRepository organizerProfileRepository
    ) {
        this.workspaceRepository = workspaceRepository;
        this.resourceRepository = resourceRepository;
        this.resourceTypeRepository = resourceTypeRepository;
        this.operatingHourRepository = operatingHourRepository;
        this.workspaceAmenityRepository = workspaceAmenityRepository;
        this.cancellationRuleRepository = cancellationRuleRepository;
        this.platformSettingRepository = platformSettingRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.organizerProfileRepository = organizerProfileRepository;
    }

    public NexBotContextGrounder withExtras(
            ResourceUsageRepository usageRepository,
            ICustomerReviewRepository reviewRepository,
            IPricingRuleRepository pricingRepository
    ) {
        this.resourceUsageRepository = usageRepository;
        this.customerReviewRepository = reviewRepository;
        this.pricingRuleRepository = pricingRepository;
        return this;
    }

    @Transactional(readOnly = true)
    public GroundingSnapshot capture(Long actorId, Long requestedWorkspaceId, String userQuery, String currentPath) {
        ParsedQuery parsed = NexBotQueryParser.parse(userQuery);
        RuntimeSettings settings = loadRuntimeSettings();
        List<WorkspaceModel> selectedModels = selectCandidateWorkspaces(requestedWorkspaceId, parsed);
        Map<Long, List<WorkspaceOperatingHourModel>> hoursByWs = batchOperatingHours(
                selectedModels.stream().map(WorkspaceModel::getId).toList());
        Map<Long, RatingSummary> ratingsByWs = batchRatings(
                selectedModels.stream().map(WorkspaceModel::getId).toList());

        List<WorkspaceSnapshot> workspaces = new ArrayList<>(selectedModels.size());
        List<MatchedResourceOption> matchedOptions = new ArrayList<>();

        for (WorkspaceModel w : selectedModels) {
            boolean includeDetailedResources = (requestedWorkspaceId != null && requestedWorkspaceId.equals(w.getId()))
                    || parsed.hasMultiFilterSearchIntent();
            List<WorkspaceOperatingHourModel> wsHours = hoursByWs.getOrDefault(w.getId(), List.of());
            RatingSummary rating = ratingsByWs.get(w.getId());

            WorkspaceBuildResult built = buildWorkspaceSnapshot(
                    w, wsHours, rating, settings, parsed, includeDetailedResources);
            workspaces.add(built.snapshot());
            matchedOptions.addAll(built.matchedOptions());
        }

        List<MatchedResourceOption> rankedOptions = matchedOptions.stream()
                .sorted(Comparator
                        .comparingInt(MatchedResourceOption::matchScore).reversed()
                        .thenComparing(MatchedResourceOption::individuallyBookable, Comparator.reverseOrder())
                        .thenComparing(o -> o.hourlyPrice() != null ? o.hourlyPrice() : BigDecimal.valueOf(Long.MAX_VALUE)))
                .limit(MAX_MATCHED_OPTIONS)
                .toList();

        UserSnapshot user = loadUserSnapshot(actorId, settings);
        return new GroundingSnapshot(settings, workspaces, rankedOptions, user, parsed, requestedWorkspaceId, currentPath);
    }

    private RuntimeSettings loadRuntimeSettings() {
        int holdTtl = readIntSetting("booking.hold_ttl_minutes", "booking_hold_minutes", 15);
        int maxActiveHolds = readIntSetting("booking.max_active_holds", "booking_max_active_holds", 3);
        int spamThreshold = readIntSetting("booking.spam_hold_threshold", "booking_spam_hold_threshold", defaultSpamThreshold);
        int spamBlockMinutes = readIntSetting("booking.spam_hold_block_minutes", "booking_spam_hold_block_minutes", defaultSpamBlockMinutes);
        int maxAdvanceDays = readIntSetting("booking.max_advance_days", null, 90);
        BigDecimal vatPercent = readDecimalSetting("payment.vat_percent", new BigDecimal("8"));
        BigDecimal commissionPercent = readDecimalSetting("payment.platform_commission_percent", new BigDecimal("10"));
        return new RuntimeSettings(
                holdTtl,
                maxHoldLifetimeMinutes,
                maxActiveHolds,
                reholdCooldownSeconds,
                spamThreshold,
                spamBlockMinutes,
                maxAdvanceDays,
                vatPercent,
                commissionPercent
        );
    }

    private int readIntSetting(String primaryKey, String fallbackKey, int defaultValue) {
        if (platformSettingRepository == null) return defaultValue;
        try {
            Optional<PlatformSettingModel> row = platformSettingRepository.findById(primaryKey);
            if (row.isEmpty() && fallbackKey != null) {
                row = platformSettingRepository.findById(fallbackKey);
            }
            return row.map(PlatformSettingModel::getSettingValue)
                    .map(v -> Integer.parseInt(v.trim()))
                    .orElse(defaultValue);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private BigDecimal readDecimalSetting(String key, BigDecimal defaultValue) {
        if (platformSettingRepository == null) return defaultValue;
        try {
            return platformSettingRepository.findById(key)
                    .map(PlatformSettingModel::getSettingValue)
                    .map(v -> new BigDecimal(v.trim()))
                    .orElse(defaultValue);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private List<WorkspaceModel> selectCandidateWorkspaces(Long requestedWorkspaceId, ParsedQuery parsed) {
        if (workspaceRepository == null) return Collections.emptyList();
        try {
            LinkedHashMap<Long, WorkspaceModel> selected = new LinkedHashMap<>();

            if (requestedWorkspaceId != null && requestedWorkspaceId > 0) {
                workspaceRepository.findByIdAndStatus(requestedWorkspaceId, WorkspaceStatus.ACTIVE)
                        .ifPresent(w -> selected.put(w.getId(), w));
            }

            List<WorkspaceModel> allActive = safeFindAllActive();
            if (!allActive.isEmpty()) {
                allActive.stream()
                        .map(w -> Map.entry(w, scoreWorkspaceRelevance(w, parsed)))
                        .filter(entry -> entry.getValue() > 0)
                        .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                        .limit(MAX_WORKSPACES_IN_CONTEXT)
                        .forEach(entry -> selected.putIfAbsent(entry.getKey().getId(), entry.getKey()));
            }

            for (WorkspaceModel w : safeFindFeatured()) {
                if (selected.size() >= MAX_WORKSPACES_IN_CONTEXT) break;
                selected.putIfAbsent(w.getId(), w);
            }
            for (WorkspaceModel w : allActive) {
                if (selected.size() >= MAX_WORKSPACES_IN_CONTEXT) break;
                selected.putIfAbsent(w.getId(), w);
            }
            return new ArrayList<>(selected.values());
        } catch (Exception e) {
            log.warn("Could not load workspace grounding context: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private int scoreWorkspaceRelevance(WorkspaceModel w, ParsedQuery parsed) {
        int score = 0;
        String city = safeLower(w.getCity());
        String district = safeLower(w.getDistrict());
        String address = safeLower(w.getAddress());
        String name = safeLower(w.getName());
        String desc = safeLower(w.getDescription());
        String hay = name + " " + address + " " + district + " " + city + " " + desc;

        for (String loc : parsed.locations()) {
            if (city.contains(loc) || district.contains(loc) || address.contains(loc) || name.contains(loc)) {
                score += 20;
            }
        }
        if (parsed.workspaceCategory() != null && w.getCategory() == parsed.workspaceCategory()) {
            score += 10;
        }
        String lowerQuery = parsed.rawQuery().toLowerCase(Locale.ROOT);
        for (String token : lowerQuery.split("\\s+")) {
            if (token.length() >= 3 && hay.contains(token)) {
                score += 2;
            }
        }
        return score;
    }

    private List<WorkspaceModel> safeFindFeatured() {
        try {
            List<WorkspaceModel> list = workspaceRepository.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE);
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<WorkspaceModel> safeFindAllActive() {
        try {
            List<WorkspaceModel> list = workspaceRepository.findByStatus(WorkspaceStatus.ACTIVE);
            if (list != null && !list.isEmpty()) return list;
            return workspaceRepository.findAll().stream()
                    .filter(w -> w.getBaseStatus() == WorkspaceStatus.ACTIVE)
                    .toList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Map<Long, List<WorkspaceOperatingHourModel>> batchOperatingHours(Collection<Long> workspaceIds) {
        if (operatingHourRepository == null || workspaceIds.isEmpty()) return Collections.emptyMap();
        try {
            List<WorkspaceOperatingHourModel> rows = operatingHourRepository.findByWorkspaceIdIn(workspaceIds);
            if (rows == null) return Collections.emptyMap();
            return rows.stream()
                    .filter(h -> h.getId() != null && h.getId().getWorkspaceId() != null)
                    .collect(Collectors.groupingBy(h -> h.getId().getWorkspaceId()));
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private Map<Long, RatingSummary> batchRatings(List<Long> workspaceIds) {
        if (customerReviewRepository == null || workspaceIds.isEmpty()) return Collections.emptyMap();
        try {
            List<Object[]> rows = customerReviewRepository.findRatingSummariesByWorkspaceIds(workspaceIds, ReviewStatus.PUBLISHED);
            if (rows == null) return Collections.emptyMap();
            Map<Long, RatingSummary> map = new HashMap<>();
            for (Object[] row : rows) {
                if (row[0] instanceof Long wsId) {
                    double avg = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                    long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
                    map.put(wsId, new RatingSummary(avg, count));
                }
            }
            return map;
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private WorkspaceBuildResult buildWorkspaceSnapshot(
            WorkspaceModel w,
            List<WorkspaceOperatingHourModel> hours,
            RatingSummary rating,
            RuntimeSettings settings,
            ParsedQuery parsed,
            boolean includeDetailedResources
    ) {
        List<BookableResourceModel> resources = safeResources(w.getId());
        List<ResourceTypeModel> resourceTypes = safeResourceTypes(w.getId());
        List<WorkspaceAmenityModel> amenities = safeAmenities(w.getId());
        List<CancellationRuleDto> cancellationRules = safeCancellationRules(w.getId());
        List<PricingRuleModel> pricingRules = safePricingRules(w.getId());

        List<BookableResourceModel> activeResources = resources.stream()
                .filter(r -> r.getStatus() == BookableResourceStatus.ACTIVE)
                .toList();
        List<BookableResourceModel> bookableTopLevel = activeResources.stream()
                .filter(r -> r.getParentRoom() == null)
                .toList();

        BigDecimal minHourly = null;
        BigDecimal maxHourly = null;
        boolean hasDesk = false;
        boolean hasRoom = false;

        for (BookableResourceModel r : bookableTopLevel) {
            ResourceTypeModel rt = r.getResourceType();
            if (rt != null) {
                if (rt.getCategory() == ResourceCategory.DESK) hasDesk = true;
                if (rt.getCategory() == ResourceCategory.ROOM) hasRoom = true;
            }
            BigDecimal rate = resolveHourlyPrice(r);
            if (rate != null && rate.signum() > 0) {
                if (minHourly == null || rate.compareTo(minHourly) < 0) minHourly = rate;
                if (maxHourly == null || rate.compareTo(maxHourly) > 0) maxHourly = rate;
            }
        }

        BigDecimal minDaily = null;
        for (ResourceTypeModel rt : resourceTypes) {
            if (!rt.isActive()) continue;
            if (rt.getCategory() == ResourceCategory.DESK) hasDesk = true;
            if (rt.getCategory() == ResourceCategory.ROOM) hasRoom = true;
            if (rt.getPricePerHour() != null && rt.getPricePerHour().signum() > 0) {
                if (minHourly == null || rt.getPricePerHour().compareTo(minHourly) < 0) minHourly = rt.getPricePerHour();
                if (maxHourly == null || rt.getPricePerHour().compareTo(maxHourly) > 0) maxHourly = rt.getPricePerHour();
            }
            if (rt.getPricePerDay() != null && rt.getPricePerDay().signum() > 0) {
                if (minDaily == null || rt.getPricePerDay().compareTo(minDaily) < 0) minDaily = rt.getPricePerDay();
            }
        }

        List<String> freeAmenities = amenities.stream()
                .filter(wa -> wa.getAmenity() != null && wa.getAmenity().isActive())
                .filter(wa -> wa.getAddonPricePerHour() == null || wa.getAddonPricePerHour().signum() <= 0)
                .map(wa -> wa.getAmenity().getName())
                .distinct()
                .limit(10)
                .toList();

        List<String> paidAddons = amenities.stream()
                .filter(wa -> wa.getAmenity() != null && wa.getAmenity().isActive())
                .filter(wa -> wa.getAddonPricePerHour() != null && wa.getAddonPricePerHour().signum() > 0)
                .map(wa -> wa.getAmenity().getName() + " (+" + formatVnd(wa.getAddonPricePerHour()) + "đ/giờ)")
                .distinct()
                .limit(8)
                .toList();

        // Check schedule & real-time occupancy if a window was parsed
        ScheduleCheck scheduleCheck = checkSchedule(w, hours, parsed.startTime(), parsed.endTime());
        Map<Long, Set<AvailabilityState>> occupancy = (parsed.startTime() != null && parsed.endTime() != null && resourceUsageRepository != null)
                ? safeOccupancy(w.getId(), parsed.startTime(), parsed.endTime())
                : Collections.emptyMap();

        Map<Long, List<BookableResourceModel>> childrenByRoom = activeResources.stream()
                .filter(r -> r.getParentRoom() != null)
                .collect(Collectors.groupingBy(r -> r.getParentRoom().getId()));
        Set<Long> maintenanceIds = occupancy.entrySet().stream()
                .filter(e -> e.getValue().contains(AvailabilityState.MAINTENANCE))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        List<ResourceSnapshot> focusedResources = includeDetailedResources
                ? bookableTopLevel.stream()
                    .limit(MAX_FOCUSED_RESOURCES)
                    .map(r -> toResourceSnapshot(r, childrenByRoom.getOrDefault(r.getId(), List.of()), occupancy, maintenanceIds, scheduleCheck))
                    .toList()
                : Collections.emptyList();

        List<MatchedResourceOption> matchedOptions = new ArrayList<>();
        if (parsed.hasMultiFilterSearchIntent()) {
            int wsBaseScore = scoreWorkspaceRelevance(w, parsed);
            boolean amenityMatch = matchesAmenityKeywords(freeAmenities, paidAddons, parsed.amenityKeywords());
            if (!parsed.amenityKeywords().isEmpty() && amenityMatch) {
                wsBaseScore += 10;
            }
            for (BookableResourceModel r : activeResources) {
                MatchedResourceOption opt = evaluateResourceMatch(
                        w, r, childrenByRoom.getOrDefault(r.getId(), List.of()),
                        occupancy, maintenanceIds, scheduleCheck, pricingRules, settings, parsed, wsBaseScore);
                if (opt != null) {
                    matchedOptions.add(opt);
                }
            }
        }

        WorkspaceSnapshot snapshot = new WorkspaceSnapshot(
                w.getId(),
                w.getName(),
                w.getCategory() != null ? w.getCategory().name() : "COWORKING_HUB",
                w.getAddress(),
                w.getDistrict(),
                w.getCity(),
                minHourly,
                maxHourly,
                minDaily,
                bookableTopLevel.size(),
                hasDesk,
                hasRoom,
                summarizeHours(hours),
                freeAmenities,
                paidAddons,
                summarizeCancellation(cancellationRules),
                rating != null ? rating.avg() : null,
                rating != null ? rating.count() : 0L,
                focusedResources
        );
        return new WorkspaceBuildResult(snapshot, matchedOptions);
    }

    private MatchedResourceOption evaluateResourceMatch(
            WorkspaceModel w,
            BookableResourceModel r,
            List<BookableResourceModel> children,
            Map<Long, Set<AvailabilityState>> occupancy,
            Set<Long> maintenanceIds,
            ScheduleCheck scheduleCheck,
            List<PricingRuleModel> pricingRules,
            RuntimeSettings settings,
            ParsedQuery parsed,
            int wsBaseScore
    ) {
        if (!parsed.locations().isEmpty() && wsBaseScore < 15) {
            return null;
        }
        ResourceTypeModel rt = r.getResourceType();
        ResourceCategory category = rt != null ? rt.getCategory() : ResourceCategory.DESK;
        if (parsed.resourceCategory() != null && category != parsed.resourceCategory()) {
            return null;
        }

        int capacity = r.getCapacityOverride() != null
                ? r.getCapacityOverride()
                : (rt != null ? rt.getCapacity() : 1);
        if (parsed.minCapacity() != null && capacity < parsed.minCapacity()) {
            return null;
        }
        if (parsed.noiseLevel() != null && r.getNoiseLevel() != null && r.getNoiseLevel() != parsed.noiseLevel()) {
            return null;
        }

        BigDecimal hourlyPrice = resolveHourlyPrice(r);
        int score = wsBaseScore;
        if (parsed.noiseLevel() != null && r.getNoiseLevel() == parsed.noiseLevel()) {
            score += 8;
        }

        if (!matchesPriceFilter(hourlyPrice, parsed)) {
            return null;
        }
        if (parsed.targetHourlyPrice() != null && hourlyPrice != null && hourlyPrice.compareTo(parsed.targetHourlyPrice()) == 0) {
            score += 20;
        }

        boolean tokenMatched = false;
        if (!parsed.resourceTokens().isEmpty()) {
            tokenMatched = matchesResourceToken(r, parsed.resourceTokens());
            if (!tokenMatched) {
                return null;
            }
            score += r.getParentRoom() == null ? 35 : 20;
        }
        if (r.getParentRoom() == null) {
            score += 5;
        }

        String availabilityLabel = resolveAvailabilityLabel(r, children, occupancy, maintenanceIds, scheduleCheck, parsed);
        if ("AVAILABLE".equals(availabilityLabel)) {
            score += 12;
        }

        BigDecimal estSurcharge = BigDecimal.ZERO;
        BigDecimal estFinalPrice = null;
        if (parsed.startTime() != null && parsed.endTime() != null && hourlyPrice != null && hourlyPrice.signum() > 0) {
            try {
                var quote = BookingBaseRates.quote(r, parsed.startTime(), parsed.endTime(), PriceType.HOURLY);
                estSurcharge = PricingAdjustments.surcharge(pricingRules, r, parsed.startTime(), parsed.endTime(), quote.baseAmount());
                BigDecimal taxable = quote.baseAmount().add(estSurcharge);
                BigDecimal tax = taxable.multiply(settings.vatPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                estFinalPrice = taxable.add(tax).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {
            }
        }

        Long linkResourceId = r.getParentRoom() != null ? r.getParentRoom().getId() : r.getId();
        String seatUrl = buildSeatUrl(w.getId(), linkResourceId, parsed.startTime(), parsed.endTime());

        return new MatchedResourceOption(
                w.getId(),
                w.getName(),
                w.getDistrict(),
                w.getCity(),
                w.getAddress(),
                r.getId(),
                r.getLabel(),
                r.getName() != null ? r.getName() : r.getLabel(),
                category.name(),
                capacity,
                r.getNoiseLevel() != null ? r.getNoiseLevel().name() : null,
                r.getZoneName(),
                hourlyPrice,
                estSurcharge,
                estFinalPrice,
                availabilityLabel,
                r.getParentRoom() == null,
                scheduleCheck.open(),
                scheduleCheck.reason(),
                seatUrl,
                score
        );
    }

    private static boolean matchesPriceFilter(BigDecimal price, ParsedQuery parsed) {
        if (!parsed.hasPriceFilter()) return true;
        if (price == null || price.signum() <= 0) return false;
        if (parsed.minHourlyPrice() != null && price.compareTo(parsed.minHourlyPrice()) < 0) return false;
        if (parsed.maxHourlyPrice() != null && price.compareTo(parsed.maxHourlyPrice()) > 0) return false;
        if (parsed.targetHourlyPrice() != null) {
            BigDecimal tolerance = parsed.targetHourlyPrice().multiply(new BigDecimal("0.30"));
            BigDecimal low = parsed.targetHourlyPrice().subtract(tolerance);
            BigDecimal high = parsed.targetHourlyPrice().add(tolerance);
            return price.compareTo(low) >= 0 && price.compareTo(high) <= 0;
        }
        return true;
    }

    private static boolean matchesResourceToken(BookableResourceModel r, List<String> tokens) {
        String label = r.getLabel() != null ? r.getLabel().toUpperCase(Locale.ROOT) : "";
        String name = r.getName() != null ? r.getName().toUpperCase(Locale.ROOT) : "";
        String idStr = r.getId() != null ? String.valueOf(r.getId()) : "";
        for (String t : tokens) {
            if (t.matches("\\d+")) {
                String regex = "^(?:.*\\D)?0*" + Pattern.quote(t) + "$";
                if (idStr.equals(t)
                        || label.matches(regex)
                        || name.matches("(?:^|.*\\D)0*" + Pattern.quote(t) + "(?:\\D.*|$)")) {
                    return true;
                }
            } else if (label.equals(t) || label.contains(t) || name.contains(t) || idStr.equals(t)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matchesAmenityKeywords(List<String> free, List<String> paid, List<String> keywords) {
        if (keywords.isEmpty()) return true;
        String joined = (String.join(" ", free) + " " + String.join(" ", paid)).toLowerCase(Locale.ROOT);
        for (String kw : keywords) {
            if (joined.contains(kw)) return true;
        }
        return false;
    }

    private ScheduleCheck checkSchedule(
            WorkspaceModel w,
            List<WorkspaceOperatingHourModel> hours,
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (start == null || end == null) {
            return new ScheduleCheck(true, null);
        }
        if (hours != null && !hours.isEmpty() && !OperatingHours.covers(hours, start, end)) {
            return new ScheduleCheck(false, "Ngoài giờ hoạt động của không gian");
        }
        try {
            VietnamHolidays.validate(w, start, end);
        } catch (Exception ex) {
            return new ScheduleCheck(false, ex.getMessage());
        }
        return new ScheduleCheck(true, null);
    }

    private Map<Long, Set<AvailabilityState>> safeOccupancy(Long workspaceId, LocalDateTime start, LocalDateTime end) {
        try {
            Map<Long, Set<AvailabilityState>> map = resourceUsageRepository.occupancyByWorkspace(workspaceId, start, end, LocalDateTime.now());
            return map != null ? map : Collections.emptyMap();
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String resolveAvailabilityLabel(
            BookableResourceModel r,
            List<BookableResourceModel> children,
            Map<Long, Set<AvailabilityState>> occupancy,
            Set<Long> maintenanceIds,
            ScheduleCheck scheduleCheck,
            ParsedQuery parsed
    ) {
        if (parsed.startTime() == null || parsed.endTime() == null) {
            return r.getStatus() == BookableResourceStatus.ACTIVE ? "ACTIVE" : r.getStatus().name();
        }
        if (!scheduleCheck.open()) {
            return "CLOSED_OR_HOLIDAY";
        }
        Set<AvailabilityState> flags = new HashSet<>(occupancy.getOrDefault(r.getId(), Set.of()));
        if (r.getParentRoom() != null) {
            flags.addAll(occupancy.getOrDefault(r.getParentRoom().getId(), Set.of()));
        }
        for (BookableResourceModel child : children) {
            Set<AvailabilityState> childFlags = occupancy.getOrDefault(child.getId(), Set.of());
            if (childFlags.contains(AvailabilityState.BOOKED)) flags.add(AvailabilityState.BOOKED);
            if (childFlags.contains(AvailabilityState.LOCKED)) flags.add(AvailabilityState.LOCKED);
        }
        if (ResourceMaintenance.capacity(r, children, maintenanceIds) == 0 || flags.contains(AvailabilityState.MAINTENANCE)) {
            return "MAINTENANCE";
        }
        if (flags.contains(AvailabilityState.BOOKED)) {
            return "BOOKED";
        }
        if (flags.contains(AvailabilityState.LOCKED)) {
            return "LOCKED";
        }
        if (r.getParentRoom() != null) {
            return "ROOM_CHILD_ONLY";
        }
        return "AVAILABLE";
    }

    private ResourceSnapshot toResourceSnapshot(
            BookableResourceModel r,
            List<BookableResourceModel> children,
            Map<Long, Set<AvailabilityState>> occupancy,
            Set<Long> maintenanceIds,
            ScheduleCheck scheduleCheck
    ) {
        ResourceTypeModel rt = r.getResourceType();
        BigDecimal price = resolveHourlyPrice(r);
        int capacity = r.getCapacityOverride() != null
                ? r.getCapacityOverride()
                : (rt != null ? rt.getCapacity() : 1);
        String state = "ACTIVE";
        if (!occupancy.isEmpty() || !scheduleCheck.open()) {
            if (!scheduleCheck.open()) {
                state = "CLOSED";
            } else {
                Set<AvailabilityState> flags = occupancy.getOrDefault(r.getId(), Set.of());
                if (ResourceMaintenance.capacity(r, children, maintenanceIds) == 0 || flags.contains(AvailabilityState.MAINTENANCE)) {
                    state = "MAINTENANCE";
                } else if (flags.contains(AvailabilityState.BOOKED)) {
                    state = "BOOKED";
                } else if (flags.contains(AvailabilityState.LOCKED)) {
                    state = "LOCKED";
                } else {
                    state = "AVAILABLE";
                }
            }
        }
        return new ResourceSnapshot(
                r.getId(),
                r.getLabel(),
                r.getName() != null ? r.getName() : r.getLabel(),
                rt != null && rt.getCategory() != null ? rt.getCategory().name() : "DESK",
                capacity,
                price,
                r.getZoneName(),
                state
        );
    }

    private static BigDecimal resolveHourlyPrice(BookableResourceModel r) {
        if (r.getPricePerHour() != null) return r.getPricePerHour();
        return r.getResourceType() != null ? r.getResourceType().getPricePerHour() : null;
    }

    private static String buildSeatUrl(Long workspaceId, Long resourceId, LocalDateTime start, LocalDateTime end) {
        StringBuilder sb = new StringBuilder("/workspaces/seats?workspaceId=").append(workspaceId);
        if (resourceId != null) {
            sb.append("&resourceId=").append(resourceId);
        }
        if (start != null && end != null) {
            sb.append("&startTime=").append(URLEncoder.encode(start.format(ISO_FMT), StandardCharsets.UTF_8));
            sb.append("&endTime=").append(URLEncoder.encode(end.format(ISO_FMT), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private List<BookableResourceModel> safeResources(Long workspaceId) {
        if (resourceRepository == null) return Collections.emptyList();
        try {
            List<BookableResourceModel> rows = resourceRepository.findByFloorPlanWorkspaceId(workspaceId);
            return rows != null ? rows : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<ResourceTypeModel> safeResourceTypes(Long workspaceId) {
        if (resourceTypeRepository == null) return Collections.emptyList();
        try {
            List<ResourceTypeModel> rows = resourceTypeRepository.findByWorkspaceId(workspaceId);
            return rows != null ? rows : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<WorkspaceAmenityModel> safeAmenities(Long workspaceId) {
        if (workspaceAmenityRepository == null) return Collections.emptyList();
        try {
            List<WorkspaceAmenityModel> rows = workspaceAmenityRepository.findAllByWorkspaceId(workspaceId);
            return rows != null ? rows : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<CancellationRuleDto> safeCancellationRules(Long workspaceId) {
        if (cancellationRuleRepository == null) return CancellationPolicies.defaults();
        try {
            var rows = cancellationRuleRepository.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(workspaceId);
            return CancellationPolicies.effective(rows);
        } catch (Exception e) {
            return CancellationPolicies.defaults();
        }
    }

    private List<PricingRuleModel> safePricingRules(Long workspaceId) {
        if (pricingRuleRepository == null) return Collections.emptyList();
        try {
            List<PricingRuleModel> rows = pricingRuleRepository.findByWorkspaceId(workspaceId);
            return rows != null ? rows : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private UserSnapshot loadUserSnapshot(Long actorId, RuntimeSettings settings) {
        if (actorId == null || userRepository == null) return null;
        try {
            Optional<UserModel> userOpt = userRepository.findById(actorId);
            if (userOpt.isEmpty()) return null;
            UserModel user = userOpt.get();
            String role = user.getRoleEntity() != null ? user.getRoleEntity().getName() : "USER";
            String fullName = ((user.getFirstName() != null ? user.getFirstName() : "") + " "
                    + (user.getLastName() != null ? user.getLastName() : "")).trim();
            if (fullName.isEmpty()) fullName = user.getUserName();

            long activeHolds = 0;
            List<BookingSnapshot> recentBookings = Collections.emptyList();
            if (bookingRepository != null) {
                LocalDateTime now = LocalDateTime.now();
                activeHolds = bookingRepository.countActiveHoldsByCustomer(actorId, now);
                var page = bookingRepository.findCustomerBookingsWithDetails(
                        actorId,
                        null,
                        PageRequest.of(0, MAX_RECENT_BOOKINGS, Sort.by(Sort.Direction.DESC, "createdAt"))
                );
                if (page != null && page.hasContent()) {
                    recentBookings = page.getContent().stream().map(this::toBookingSnapshot).toList();
                }
            }

            String organizerStatus = null;
            boolean organizerSuspended = false;
            if (organizerProfileRepository != null) {
                Optional<OrganizerProfileModel> profileOpt = organizerProfileRepository.findByOrganizerId(actorId);
                if (profileOpt.isPresent()) {
                    OrganizerProfileModel profile = profileOpt.get();
                    organizerStatus = profile.getStatus() != null ? profile.getStatus().name() : null;
                    organizerSuspended = profile.isSuspended();
                }
            }

            String preferenceSummary = safePreferenceSummary(actorId);
            long favoriteCount = safeFavoriteCount(actorId);
            List<String> savedSearchNames = safeSavedSearchNames(actorId);

            return new UserSnapshot(
                    role,
                    fullName,
                    activeHolds,
                    settings.maxActiveHolds(),
                    user.getBookingSuspendedUntil(),
                    recentBookings,
                    organizerStatus,
                    organizerSuspended,
                    preferenceSummary,
                    favoriteCount,
                    savedSearchNames
            );
        } catch (Exception e) {
            log.warn("Could not load authenticated user context for NexBot: {}", e.getMessage());
            return null;
        }
    }

    private String safePreferenceSummary(Long actorId) {
        if (customerPreferenceRepository == null) return null;
        try {
            Optional<CustomerPreferenceModel> opt = customerPreferenceRepository.findByCustomerId(actorId);
            if (opt.isEmpty()) return null;
            CustomerPreferenceModel pref = opt.get();
            List<String> parts = new ArrayList<>();
            if (pref.getResourceCategory() != null) parts.add("Loại: " + pref.getResourceCategory().name());
            if (pref.getNoiseLevel() != null) parts.add("Độ ồn: " + pref.getNoiseLevel().name());
            if (pref.getBudgetMax() != null) parts.add("Ngân sách tối đa: " + formatVnd(pref.getBudgetMax()) + "đ");
            if (pref.getPurpose() != null) parts.add("Mục đích: " + pref.getPurpose().name());
            return parts.isEmpty() ? null : String.join(", ", parts);
        } catch (Exception e) {
            return null;
        }
    }

    private long safeFavoriteCount(Long actorId) {
        if (favoriteWorkspaceRepository == null) return 0L;
        try {
            var page = favoriteWorkspaceRepository.findByCustomerId(actorId, PageRequest.of(0, 1));
            return page != null ? page.getTotalElements() : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }

    private List<String> safeSavedSearchNames(Long actorId) {
        if (savedSearchFilterRepository == null) return List.of();
        try {
            List<SavedSearchFilterModel> rows = savedSearchFilterRepository.findByCustomerIdOrderByCreatedAtDesc(actorId);
            if (rows == null) return List.of();
            return rows.stream().map(SavedSearchFilterModel::getName).limit(5).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private BookingSnapshot toBookingSnapshot(BookingModel b) {
        String wsName = b.getWorkspace() != null ? b.getWorkspace().getName() : "Không gian NexSpace";
        Long wsId = b.getWorkspace() != null ? b.getWorkspace().getId() : null;
        String resLabel = b.getResource() != null
                ? (b.getResource().getName() != null ? b.getResource().getName() : b.getResource().getLabel())
                : "Vị trí đặt chỗ";
        return new BookingSnapshot(
                b.getId(),
                b.getBookingCode(),
                b.getStatus() != null ? b.getStatus().name() : "UNKNOWN",
                wsId,
                wsName,
                resLabel,
                b.getStartTime(),
                b.getEndTime(),
                b.getFinalPrice(),
                b.getHoldExpiresAt()
        );
    }

    private static String safeLower(String val) {
        return val == null ? "" : val.toLowerCase(Locale.ROOT);
    }

    private static String summarizeHours(List<WorkspaceOperatingHourModel> hours) {
        if (hours == null || hours.isEmpty()) return "Theo cấu hình không gian";
        return hours.stream()
                .sorted(Comparator.comparingInt(h -> h.getId() != null && h.getId().getDayOfWeek() != null ? h.getId().getDayOfWeek() : 9))
                .map(h -> {
                    String day = dayLabel(h.getId() != null ? h.getId().getDayOfWeek() : null);
                    if (h.isClosed()) return day + ": Nghỉ";
                    if (h.isFullDay()) return day + ": 24/24";
                    if (h.getOpenTime() != null && h.getCloseTime() != null) {
                        return day + ": " + h.getOpenTime().format(HOUR_FMT) + "-" + h.getCloseTime().format(HOUR_FMT)
                                + (h.isClosesNextDay() ? " (+1 ngày)" : "");
                    }
                    return day + ": Linh hoạt";
                })
                .collect(Collectors.joining("; "));
    }

    private static String dayLabel(Integer day) {
        if (day == null) return "?";
        return switch (day) {
            case 1 -> "T2";
            case 2 -> "T3";
            case 3 -> "T4";
            case 4 -> "T5";
            case 5 -> "T6";
            case 6 -> "T7";
            case 7 -> "CN";
            default -> "T" + day;
        };
    }

    private static String summarizeCancellation(List<CancellationRuleDto> rules) {
        if (rules == null || rules.isEmpty()) return "Không hoàn tiền";
        return rules.stream()
                .map(r -> ">=" + r.minHoursBeforeStart().stripTrailingZeros().toPlainString()
                        + "h: hoàn " + r.refundPercent().stripTrailingZeros().toPlainString() + "%")
                .collect(Collectors.joining(", "));
    }

    public static String formatVnd(BigDecimal amount) {
        if (amount == null) return "0";
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));
        nf.setMaximumFractionDigits(0);
        return nf.format(amount);
    }

    private record RatingSummary(double avg, long count) {}
    private record ScheduleCheck(boolean open, String reason) {}
    private record WorkspaceBuildResult(WorkspaceSnapshot snapshot, List<MatchedResourceOption> matchedOptions) {}

    public record RuntimeSettings(
            int holdTtlMinutes,
            int maxHoldLifetimeMinutes,
            int maxActiveHolds,
            int reholdCooldownSeconds,
            int spamThreshold,
            int spamBlockMinutes,
            int maxAdvanceDays,
            BigDecimal vatPercent,
            BigDecimal commissionPercent
    ) {}

    public record ResourceSnapshot(
            Long id,
            String code,
            String name,
            String category,
            int capacity,
            BigDecimal pricePerHour,
            String zoneName,
            String availabilityState
    ) {}

    public record MatchedResourceOption(
            Long workspaceId,
            String workspaceName,
            String district,
            String city,
            String address,
            Long resourceId,
            String resourceCode,
            String resourceName,
            String resourceCategory,
            int capacity,
            String noiseLevel,
            String zoneName,
            BigDecimal hourlyPrice,
            BigDecimal estimatedSurcharge,
            BigDecimal estimatedFinalPrice,
            String availabilityState,
            boolean individuallyBookable,
            boolean openForWindow,
            String scheduleBlockReason,
            String directSeatUrl,
            int matchScore
    ) {}

    public record WorkspaceSnapshot(
            Long id,
            String name,
            String category,
            String address,
            String district,
            String city,
            BigDecimal minHourlyPrice,
            BigDecimal maxHourlyPrice,
            BigDecimal minDailyPrice,
            int activeResourceCount,
            boolean hasDesk,
            boolean hasRoom,
            String operatingHoursSummary,
            List<String> freeAmenities,
            List<String> paidAddons,
            String cancellationSummary,
            Double averageRating,
            long reviewCount,
            List<ResourceSnapshot> focusedResources
    ) {}

    public record BookingSnapshot(
            Long id,
            String bookingCode,
            String status,
            Long workspaceId,
            String workspaceName,
            String resourceLabel,
            LocalDateTime startTime,
            LocalDateTime endTime,
            BigDecimal finalPrice,
            LocalDateTime holdExpiresAt
    ) {}

    public record UserSnapshot(
            String role,
            String displayName,
            long activeHoldCount,
            int maxActiveHolds,
            LocalDateTime bookingSuspendedUntil,
            List<BookingSnapshot> recentBookings,
            String organizerApplicationStatus,
            boolean organizerSuspended,
            String preferenceSummary,
            long favoriteCount,
            List<String> savedSearchNames
    ) {}

    public record GroundingSnapshot(
            RuntimeSettings settings,
            List<WorkspaceSnapshot> workspaces,
            List<MatchedResourceOption> matchedOptions,
            UserSnapshot user,
            ParsedQuery parsedQuery,
            Long focusedWorkspaceId,
            String currentPath
    ) {
        public String toPromptContext(String clientRoleHint) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n\n[DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC]\n");
            sb.append("CẤU HÌNH HỆ THỐNG HIỆN HÀNH:\n");
            sb.append(String.format(
                    "- Thời gian giữ chỗ tạm thời (Hold TTL): %d phút (trần tối đa %d phút)\n"
                            + "- Số giữ chỗ đồng thời tối đa/tài khoản: %d chỗ | Cooldown tái giữ cùng vị trí: %d giây\n"
                            + "- Chống spam hold: quá %d lần giữ/hủy không thanh toán trong 2 giờ -> khóa đặt/giữ %d phút\n"
                            + "- Đặt trước tối đa: %d ngày | Thời lượng tối thiểu: 30 phút | Đệm dọn phòng họp: 15 phút\n"
                            + "- Thuế VAT: %s%% | Phí dịch vụ khách: 0%% | Hoa hồng nền tảng (Organizer): %s%%\n",
                    settings.holdTtlMinutes(),
                    settings.maxHoldLifetimeMinutes(),
                    settings.maxActiveHolds(),
                    settings.reholdCooldownSeconds(),
                    settings.spamThreshold(),
                    settings.spamBlockMinutes(),
                    settings.maxAdvanceDays(),
                    settings.vatPercent().stripTrailingZeros().toPlainString(),
                    settings.commissionPercent().stripTrailingZeros().toPlainString()
            ));

            if (currentPath != null && !currentPath.isBlank()) {
                sb.append("- Đường dẫn người dùng đang mở: ").append(currentPath).append("\n");
            }
            if (focusedWorkspaceId != null) {
                sb.append("- Mã workspace đang xem: ID ").append(focusedWorkspaceId).append("\n");
            }

            if (parsedQuery != null && parsedQuery.hasMultiFilterSearchIntent()) {
                sb.append("\nPHÂN TÍCH ĐIỀU KIỆN LỌC TỪ CÂU HỎI KHÁCH HÀNG:\n");
                sb.append("- Khu vực: ").append(parsedQuery.locations().isEmpty() ? "Không giới hạn" : String.join(", ", parsedQuery.locations())).append("\n");
                if (parsedQuery.targetHourlyPrice() != null) {
                    sb.append("- Giá mục tiêu: ~").append(formatVnd(parsedQuery.targetHourlyPrice())).append("đ/giờ\n");
                } else if (parsedQuery.minHourlyPrice() != null || parsedQuery.maxHourlyPrice() != null) {
                    sb.append("- Khoảng giá: ")
                            .append(parsedQuery.minHourlyPrice() != null ? formatVnd(parsedQuery.minHourlyPrice()) : "0")
                            .append("đ - ")
                            .append(parsedQuery.maxHourlyPrice() != null ? formatVnd(parsedQuery.maxHourlyPrice()) + "đ" : "không giới hạn")
                            .append("/giờ\n");
                }
                if (parsedQuery.startTime() != null && parsedQuery.endTime() != null) {
                    sb.append("- Khung giờ kiểm tra chỗ trống: ")
                            .append(parsedQuery.startTime().format(TIME_FMT))
                            .append(" -> ")
                            .append(parsedQuery.endTime().format(TIME_FMT))
                            .append(parsedQuery.timeExplicit() ? " (theo giờ khách chọn)\n" : " (khung gợi ý gần nhất vì khách chưa nêu giờ cụ thể)\n");
                }
                if (!parsedQuery.resourceTokens().isEmpty()) {
                    sb.append("- Mã/Số ghế hoặc phòng khách hỏi: ").append(String.join(", ", parsedQuery.resourceTokens())).append("\n");
                }

                if (!matchedOptions.isEmpty()) {
                    sb.append("\nKẾT QUẢ KHỚP ĐA ĐIỀU KIỆN & KIỂM TRA AVAILABLE THỜI GIAN THỰC:\n");
                    for (MatchedResourceOption opt : matchedOptions) {
                        sb.append(String.format(
                                "* %s (%s, %s) | Vị trí ID %d [%s - %s] (%s, sức chứa %d%s%s) | Giá: %sđ/giờ%s | Trạng thái: %s%s | Đặt lẻ: %s | Link đặt ngay: %s\n",
                                opt.workspaceName(),
                                opt.district() != null ? opt.district() : "",
                                opt.city() != null ? opt.city() : "",
                                opt.resourceId(),
                                opt.resourceCode(),
                                opt.resourceName(),
                                opt.resourceCategory(),
                                opt.capacity(),
                                opt.noiseLevel() != null ? ", " + opt.noiseLevel() : "",
                                opt.zoneName() != null ? ", khu " + opt.zoneName() : "",
                                opt.hourlyPrice() != null ? formatVnd(opt.hourlyPrice()) : "0",
                                opt.estimatedFinalPrice() != null ? " (tạm tính sau VAT: " + formatVnd(opt.estimatedFinalPrice()) + "đ)" : "",
                                opt.availabilityState(),
                                opt.scheduleBlockReason() != null ? " (" + opt.scheduleBlockReason() + ")" : "",
                                opt.individuallyBookable() ? "Có" : "Không (thuộc phòng, phải đặt nguyên phòng)",
                                opt.directSeatUrl()
                        ));
                    }
                } else {
                    sb.append("\nKẾT QUẢ KHỚP ĐA ĐIỀU KIỆN: Không tìm thấy ghế/phòng nào khớp đồng thời mọi điều kiện lọc trên.\n");
                }
            }

            if (!workspaces.isEmpty()) {
                sb.append("\nDANH SÁCH KHÔNG GIAN ĐANG HOẠT ĐỘNG (DỮ LIỆU DB THẬT):\n");
                for (WorkspaceSnapshot w : workspaces) {
                    String priceStr = w.minHourlyPrice() != null
                            ? formatVnd(w.minHourlyPrice()) + (w.maxHourlyPrice() != null && !w.maxHourlyPrice().equals(w.minHourlyPrice())
                            ? " - " + formatVnd(w.maxHourlyPrice()) : "") + "đ/giờ"
                            : "Xem chi tiết trên sơ đồ";
                    if (w.minDailyPrice() != null) {
                        priceStr += " | Gói ngày từ " + formatVnd(w.minDailyPrice()) + "đ/ngày";
                    }
                    String ratingStr = w.averageRating() != null && w.reviewCount() > 0
                            ? String.format(Locale.US, "%.1f/5 (%d đánh giá)", w.averageRating(), w.reviewCount())
                            : "Chưa có đánh giá";
                    sb.append(String.format(
                            "- ID %d | %s | Link: /workspaces/%d | Link chọn chỗ: /workspaces/seats?workspaceId=%d\n"
                                    + "  Địa chỉ: %s, %s, %s | Loại: %s | Đánh giá: %s | Số chỗ hoạt động: %d (Desk: %s, Room: %s)\n"
                                    + "  Giá: %s | Giờ mở cửa: %s\n"
                                    + "  Tiện ích miễn phí: %s\n"
                                    + "  Tiện ích trả phí (add-on): %s\n"
                                    + "  Chính sách hủy: %s\n",
                            w.id(),
                            w.name(),
                            w.id(),
                            w.id(),
                            w.address() != null ? w.address() : "",
                            w.district() != null ? w.district() : "",
                            w.city() != null ? w.city() : "",
                            w.category(),
                            ratingStr,
                            w.activeResourceCount(),
                            w.hasDesk() ? "Có" : "Không",
                            w.hasRoom() ? "Có" : "Không",
                            priceStr,
                            w.operatingHoursSummary(),
                            w.freeAmenities().isEmpty() ? "Không rõ" : String.join(", ", w.freeAmenities()),
                            w.paidAddons().isEmpty() ? "Không có" : String.join(", ", w.paidAddons()),
                            w.cancellationSummary()
                    ));
                    if (!w.focusedResources().isEmpty()) {
                        sb.append("  Danh sách chỗ/phòng thật thuộc không gian ID ").append(w.id()).append(":\n");
                        for (ResourceSnapshot r : w.focusedResources()) {
                            sb.append(String.format(
                                    "    * ID %d (%s - %s) | %s | Sức chứa: %d | Giá giờ: %sđ | Khu: %s | Trạng thái: %s | Link: /workspaces/seats?workspaceId=%d&resourceId=%d\n",
                                    r.id(),
                                    r.code(),
                                    r.name(),
                                    r.category(),
                                    r.capacity(),
                                    r.pricePerHour() != null ? formatVnd(r.pricePerHour()) : "0",
                                    r.zoneName() != null ? r.zoneName() : "Chung",
                                    r.availabilityState(),
                                    w.id(),
                                    r.id()
                            ));
                        }
                    }
                }
            }

            if (user != null) {
                sb.append("\nNGỮ CẢNH NGƯỜI DÙNG HIỆN TẠI (ĐÃ XÁC THỰC JWT):\n");
                sb.append(String.format(
                        "- Tên: %s | Vai trò hệ thống: %s | Đang giữ chỗ: %d/%d slot | Yêu thích: %d workspace\n",
                        user.displayName(),
                        user.role(),
                        user.activeHoldCount(),
                        user.maxActiveHolds(),
                        user.favoriteCount()
                ));
                if (user.preferenceSummary() != null) {
                    sb.append("- Sở thích cá nhân đã lưu (/dashboard/preferences): ").append(user.preferenceSummary()).append("\n");
                }
                if (!user.savedSearchNames().isEmpty()) {
                    sb.append("- Bộ lọc đã lưu: ").append(String.join(", ", user.savedSearchNames())).append("\n");
                }
                if (user.bookingSuspendedUntil() != null && user.bookingSuspendedUntil().isAfter(LocalDateTime.now())) {
                    sb.append("- Cảnh báo khóa tạm quyền giữ/đặt chỗ đến: ")
                            .append(user.bookingSuspendedUntil().format(TIME_FMT)).append("\n");
                }
                if (user.organizerApplicationStatus() != null) {
                    sb.append("- Hồ sơ Organizer: ").append(user.organizerApplicationStatus())
                            .append(user.organizerSuspended() ? " (Đang bị tạm đình chỉ)" : "")
                            .append(" | Link quản lý: /dashboard/organizer/application\n");
                }
                if (!user.recentBookings().isEmpty()) {
                    sb.append("- Đơn đặt chỗ gần nhất của người dùng (chỉ dùng cho chính chủ):\n");
                    for (BookingSnapshot b : user.recentBookings()) {
                        sb.append(String.format(
                                "  * %s | Trạng thái: %s | %s (%s) | %s -> %s | Tổng: %sđ%s\n",
                                b.bookingCode(),
                                b.status(),
                                b.workspaceName(),
                                b.resourceLabel(),
                                b.startTime() != null ? b.startTime().format(TIME_FMT) : "",
                                b.endTime() != null ? b.endTime().format(TIME_FMT) : "",
                                formatVnd(b.finalPrice()),
                                b.holdExpiresAt() != null && "PENDING_PAYMENT".equals(b.status())
                                        ? " | Hết hạn giữ: " + b.holdExpiresAt().format(TIME_FMT)
                                        : ""
                        ));
                    }
                }
            } else {
                sb.append("\nNGỮ CẢNH NGƯỜI DÙNG HIỆN TẠI: Khách chưa đăng nhập (GUEST)");
                if (clientRoleHint != null && !clientRoleHint.isBlank()) {
                    sb.append(" (hint: ").append(clientRoleHint).append(")");
                }
                sb.append(". Nếu khách hỏi dữ liệu cá nhân (đơn đặt chỗ, lượt giữ chỗ, hồ sơ), hãy mời đăng nhập tại /auth/sign-in.\n");
            }
            return sb.toString();
        }
    }
}
