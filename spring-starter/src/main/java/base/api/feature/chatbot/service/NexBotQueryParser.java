package base.api.feature.chatbot.service;

import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.WorkspaceCategory;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic Vietnamese/English NLU query parser for NexBot.
 * Extracts multi-dimensional filters (location, price, date/time window,
 * seat/room code, capacity, noise level, amenities, availability check).
 */
public final class NexBotQueryParser {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Pattern RANGE_PRICE_PATTERN = Pattern.compile(
            "(?:từ\\s*)?(\\d+(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|ngàn|nghìn|triệu|tr|đ|vnd)?\\s*(?:-|–|->|đến|tới)\\s*(\\d+(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|ngàn|nghìn|triệu|tr|đ|vnd)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern MAX_PRICE_PATTERN = Pattern.compile(
            "(?:dưới|<=|tối đa|không quá|rẻ hơn|trở xuống)\\s*(\\d+(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|ngàn|nghìn|triệu|tr|đ|vnđ|vnd)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern EXPLICIT_PRICE_PATTERN = Pattern.compile(
            "(?:giá\\s*(?:khoảng|tầm|chỉ|từ)?\\s*(\\d+(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|ngàn|nghìn|triệu|tr|đ|vnđ|vnd)?|(\\d+(?:[.,]\\d{3})+)\\s*(?:đ|vnđ|vnd|/giờ|/h)?|(\\d+(?:[.,]\\d+)?)\\s*(k|ngàn|nghìn|triệu|tr|đ|vnđ|vnd)(?:/giờ|/h)?)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern TIME_RANGE_PATTERN = Pattern.compile(
            "(?:từ|lúc|khoảng)?\\s*(\\d{1,2})(?:\\s*[:hH]\\s*(\\d{1,2}))?\\s*(?:giờ|h)?\\s*(sáng|trưa|chiều|tối)?\\s*(?:-|–|->|đến|tới)\\s*(\\d{1,2})(?:\\s*[:hH]\\s*(\\d{1,2}))?\\s*(?:giờ|h)?\\s*(sáng|trưa|chiều|tối)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern SINGLE_TIME_PATTERN = Pattern.compile(
            "(?:lúc|vào|từ|sau|khoảng)\\s*(\\d{1,2})(?:\\s*[:hH]\\s*(\\d{1,2}))?\\s*(?:giờ|h)?\\s*(sáng|trưa|chiều|tối)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern DURATION_HOURS_PATTERN = Pattern.compile(
            "(?:trong|khoảng)\\s*(\\d+(?:[.,]5)?)\\s*(?:tiếng|giờ|h)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern FULL_DATE_PATTERN = Pattern.compile(
            "\\b(\\d{1,2})[/\\-](\\d{1,2})(?:[/\\-](\\d{4}))?\\b"
    );
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile(
            "\\b(\\d{4})-(\\d{2})-(\\d{2})\\b"
    );
    private static final Pattern CAPACITY_PATTERN = Pattern.compile(
            "\\b(\\d{1,2})\\s*(?:người|khách|thành viên|nhân sự)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern RESOURCE_CODE_PATTERN = Pattern.compile(
            "\\b([A-Za-z]{1,4}-\\d{1,3})\\b"
    );
    private static final Pattern RESOURCE_NUMBER_PATTERN = Pattern.compile(
            "(?:ghế|bàn|chỗ|phòng|desk|room)\\s*(?:số|#|mã)?\\s*([A-Za-z]{0,3}-?\\d{1,3})\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final List<String> LOCATION_CANDIDATES = List.of(
            "ngũ hành sơn", "sơn trà", "hải châu", "fpt city", "đà nẵng",
            "hòa lạc", "thạch thất", "cầu giấy", "hoàng đạo thúy", "hà nội",
            "thủ đức", "khu công nghệ cao", "hưng long", "hồ chí minh", "tp.hcm", "tphcm", "sài gòn"
    );

    private static final List<String> AMENITY_CANDIDATES = List.of(
            "wifi", "in ấn", "máy in", "màn hình", "cà phê", "trà", "bảng trắng", "máy chiếu", "đỗ xe", "gửi xe", "podcast", "livestream"
    );

    private NexBotQueryParser() {}

    public static ParsedQuery parse(String rawQuery) {
        return parse(rawQuery, Clock.system(VN_ZONE));
    }

    public static ParsedQuery parse(String rawQuery, Clock clock) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        String lower = query.toLowerCase(Locale.ROOT);
        LocalDate today = LocalDate.now(clock);
        LocalDateTime now = LocalDateTime.now(clock);

        // 1. Locations
        List<String> locations = new ArrayList<>();
        for (String loc : LOCATION_CANDIDATES) {
            if (lower.contains(loc)) {
                locations.add(normalizeLocationToken(loc));
            }
        }
        locations = locations.stream().distinct().toList();

        // 2. Prices
        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        BigDecimal targetPrice = null;

        Matcher rangeM = RANGE_PRICE_PATTERN.matcher(lower);
        if (rangeM.find()) {
            BigDecimal p1 = parseMoney(rangeM.group(1), rangeM.group(2) != null ? rangeM.group(2) : rangeM.group(4));
            BigDecimal p2 = parseMoney(rangeM.group(3), rangeM.group(4));
            if (p1 != null && p2 != null) {
                minPrice = p1.min(p2);
                maxPrice = p1.max(p2);
            }
        }

        Matcher maxM = MAX_PRICE_PATTERN.matcher(lower);
        if (maxM.find()) {
            BigDecimal p = parseMoney(maxM.group(1), maxM.group(2));
            if (p != null) {
                maxPrice = p;
            }
        }

        if (minPrice == null && maxPrice == null) {
            Matcher exactM = EXPLICIT_PRICE_PATTERN.matcher(lower);
            while (exactM.find()) {
                String num = exactM.group(1) != null ? exactM.group(1)
                        : (exactM.group(3) != null ? exactM.group(3) : exactM.group(4));
                String unit = exactM.group(2) != null ? exactM.group(2) : exactM.group(5);
                BigDecimal candidate = parseMoney(num, unit);
                if (candidate != null && candidate.compareTo(BigDecimal.valueOf(1000)) >= 0) {
                    targetPrice = candidate;
                    break;
                }
            }
        }

        // 3. Date & Time Window
        LocalDate date = extractDate(lower, today);
        boolean dateExplicit = date != null;
        TimeWindow clocks = extractTimeWindow(lower);
        boolean timeExplicit = clocks != null;

        boolean availabilityRequested = containsAny(lower,
                "available", "còn trống", "trống không", "còn chỗ", "còn bàn", "còn phòng",
                "đặt được không", "bị đặt", "đang giữ", "chỗ trống");

        LocalDateTime startTime = null;
        LocalDateTime endTime = null;
        if (dateExplicit || timeExplicit) {
            LocalDate effectiveDate = dateExplicit ? date : today;
            LocalTime startClock = clocks != null ? clocks.start() : LocalTime.of(9, 0);
            LocalTime endClock = clocks != null ? clocks.end() : startClock.plusHours(2);
            startTime = LocalDateTime.of(effectiveDate, startClock);
            endTime = endClock.isAfter(startClock)
                    ? LocalDateTime.of(effectiveDate, endClock)
                    : LocalDateTime.of(effectiveDate.plusDays(1), endClock);
            if (!dateExplicit && !startTime.isAfter(now)) {
                startTime = startTime.plusDays(1);
                endTime = endTime.plusDays(1);
            }
        } else if (availabilityRequested) {
            LocalTime nextHour = now.getMinute() >= 30
                    ? LocalTime.of((now.getHour() + 2) % 24, 0)
                    : LocalTime.of((now.getHour() + 1) % 24, 0);
            if (now.getHour() >= 20) {
                LocalDate tomorrow = today.plusDays(1);
                startTime = LocalDateTime.of(tomorrow, LocalTime.of(9, 0));
                endTime = LocalDateTime.of(tomorrow, LocalTime.of(11, 0));
            } else {
                startTime = LocalDateTime.of(today, nextHour);
                endTime = startTime.plusHours(2);
            }
        }

        // 4. Seat / Room Code / Number
        Set<String> resourceTokens = new LinkedHashSet<>();
        Matcher codeM = RESOURCE_CODE_PATTERN.matcher(query);
        while (codeM.find()) {
            String token = codeM.group(1).toUpperCase(Locale.ROOT);
            if (!token.startsWith("WS-") && !token.startsWith("BK-")) {
                resourceTokens.add(token);
            }
        }
        Matcher numM = RESOURCE_NUMBER_PATTERN.matcher(query);
        while (numM.find()) {
            resourceTokens.add(numM.group(1).toUpperCase(Locale.ROOT));
        }

        // 5. Resource Category, Workspace Category, Capacity, Noise, Amenities
        ResourceCategory resourceCategory = null;
        boolean mentionsDesk = containsAny(lower, "bàn", "ghế", "desk", "focus desk", "hot desk", "chỗ ngồi");
        boolean mentionsRoom = containsAny(lower, "phòng", "meeting room", "private office", "studio");
        if (mentionsDesk && !mentionsRoom) resourceCategory = ResourceCategory.DESK;
        else if (mentionsRoom && !mentionsDesk) resourceCategory = ResourceCategory.ROOM;

        WorkspaceCategory workspaceCategory = null;
        if (containsAny(lower, "creative studio", "studio")) workspaceCategory = WorkspaceCategory.CREATIVE_STUDIO;
        else if (containsAny(lower, "business lounge", "lounge")) workspaceCategory = WorkspaceCategory.BUSINESS_LOUNGE;
        else if (containsAny(lower, "serviced office", "văn phòng trọn gói")) workspaceCategory = WorkspaceCategory.SERVICED_OFFICE;
        else if (containsAny(lower, "coworking")) workspaceCategory = WorkspaceCategory.COWORKING_HUB;

        Integer minCapacity = null;
        Matcher capM = CAPACITY_PATTERN.matcher(lower);
        if (capM.find()) {
            minCapacity = Integer.parseInt(capM.group(1));
        }

        NoiseLevel noiseLevel = null;
        if (containsAny(lower, "yên tĩnh", "quiet", "tập trung")) noiseLevel = NoiseLevel.QUIET;
        else if (containsAny(lower, "sôi nổi", "lively", "thảo luận")) noiseLevel = NoiseLevel.LIVELY;
        else if (containsAny(lower, "vừa phải", "moderate")) noiseLevel = NoiseLevel.MODERATE;

        List<String> amenityKeywords = AMENITY_CANDIDATES.stream()
                .filter(lower::contains)
                .toList();

        boolean wantsCheapest = containsAny(lower, "rẻ nhất", "giá rẻ", "tiết kiệm", "thấp nhất");
        boolean wantsTopRated = containsAny(lower, "đánh giá cao", "tốt nhất", "nhiều sao", "4 sao", "5 sao", "nổi bật");

        return new ParsedQuery(
                query,
                locations,
                minPrice,
                maxPrice,
                targetPrice,
                resourceCategory,
                workspaceCategory,
                minCapacity,
                noiseLevel,
                List.copyOf(resourceTokens),
                amenityKeywords,
                startTime,
                endTime,
                dateExplicit || timeExplicit,
                availabilityRequested,
                wantsCheapest,
                wantsTopRated
        );
    }

    private static String normalizeLocationToken(String loc) {
        return switch (loc) {
            case "tp.hcm", "tphcm", "sài gòn" -> "hồ chí minh";
            default -> loc;
        };
    }

    private static BigDecimal parseMoney(String rawNumber, String unit) {
        if (rawNumber == null || rawNumber.isBlank()) return null;
        String cleanUnit = unit == null ? "" : unit.toLowerCase(Locale.ROOT).trim();
        try {
            if ("k".equals(cleanUnit) || "ngàn".equals(cleanUnit) || "nghìn".equals(cleanUnit)) {
                double val = Double.parseDouble(rawNumber.replace(",", "."));
                return BigDecimal.valueOf(Math.round(val * 1000));
            }
            if ("triệu".equals(cleanUnit) || "tr".equals(cleanUnit)) {
                double val = Double.parseDouble(rawNumber.replace(",", "."));
                return BigDecimal.valueOf(Math.round(val * 1_000_000));
            }
            String digitsOnly = rawNumber.replace(".", "").replace(",", "");
            BigDecimal value = new BigDecimal(digitsOnly);
            if (value.compareTo(BigDecimal.valueOf(500)) < 0 && "k".equals(cleanUnit)) {
                return value.multiply(BigDecimal.valueOf(1000));
            }
            return value;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDate extractDate(String lower, LocalDate today) {
        if (containsAny(lower, "hôm nay", "chiều nay", "tối nay", "sáng nay", "today")) {
            return today;
        }
        if (containsAny(lower, "ngày mai", "sáng mai", "chiều mai", "tối mai", "tomorrow")) {
            return today.plusDays(1);
        }
        if (containsAny(lower, "ngày kia", "ngày mốt")) {
            return today.plusDays(2);
        }
        Matcher isoM = ISO_DATE_PATTERN.matcher(lower);
        if (isoM.find()) {
            try {
                return LocalDate.parse(isoM.group(0));
            } catch (Exception ignored) {
            }
        }
        Matcher dmyM = FULL_DATE_PATTERN.matcher(lower);
        if (dmyM.find()) {
            try {
                int day = Integer.parseInt(dmyM.group(1));
                int month = Integer.parseInt(dmyM.group(2));
                int year = dmyM.group(3) != null ? Integer.parseInt(dmyM.group(3)) : today.getYear();
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    LocalDate candidate = LocalDate.of(year, month, day);
                    if (dmyM.group(3) == null && candidate.isBefore(today)) {
                        candidate = candidate.plusYears(1);
                    }
                    return candidate;
                }
            } catch (Exception ignored) {
            }
        }
        DayOfWeek targetDow = null;
        if (containsAny(lower, "thứ 2", "thứ hai", "t2")) targetDow = DayOfWeek.MONDAY;
        else if (containsAny(lower, "thứ 3", "thứ ba", "t3")) targetDow = DayOfWeek.TUESDAY;
        else if (containsAny(lower, "thứ 4", "thứ tư", "t4")) targetDow = DayOfWeek.WEDNESDAY;
        else if (containsAny(lower, "thứ 5", "thứ năm", "t5")) targetDow = DayOfWeek.THURSDAY;
        else if (containsAny(lower, "thứ 6", "thứ sáu", "t6")) targetDow = DayOfWeek.FRIDAY;
        else if (containsAny(lower, "thứ 7", "thứ bảy", "t7", "cuối tuần")) targetDow = DayOfWeek.SATURDAY;
        else if (containsAny(lower, "chủ nhật", "cn")) targetDow = DayOfWeek.SUNDAY;
        if (targetDow != null) {
            int diff = (targetDow.getValue() - today.getDayOfWeek().getValue() + 7) % 7;
            if (diff == 0) diff = 7;
            return today.plusDays(diff);
        }
        return null;
    }

    private static TimeWindow extractTimeWindow(String lower) {
        Matcher rangeM = TIME_RANGE_PATTERN.matcher(lower);
        if (rangeM.find()) {
            int h1 = adjustHour(Integer.parseInt(rangeM.group(1)), rangeM.group(3));
            int m1 = rangeM.group(2) != null ? Integer.parseInt(rangeM.group(2)) : 0;
            int h2 = adjustHour(Integer.parseInt(rangeM.group(4)), rangeM.group(6) != null ? rangeM.group(6) : rangeM.group(3));
            int m2 = rangeM.group(5) != null ? Integer.parseInt(rangeM.group(5)) : 0;
            if (isValidClock(h1, m1) && isValidClock(h2, m2)) {
                return new TimeWindow(LocalTime.of(h1, m1), LocalTime.of(h2, m2));
            }
        }

        Matcher singleM = SINGLE_TIME_PATTERN.matcher(lower);
        if (singleM.find()) {
            int h1 = adjustHour(Integer.parseInt(singleM.group(1)), singleM.group(3));
            int m1 = singleM.group(2) != null ? Integer.parseInt(singleM.group(2)) : 0;
            if (isValidClock(h1, m1)) {
                int durationMinutes = 120;
                Matcher durM = DURATION_HOURS_PATTERN.matcher(lower);
                if (durM.find()) {
                    double hrs = Double.parseDouble(durM.group(1).replace(",", "."));
                    durationMinutes = Math.max(30, (int) Math.round(hrs * 60));
                }
                LocalTime start = LocalTime.of(h1, m1);
                LocalTime end = start.plusMinutes(durationMinutes);
                return new TimeWindow(start, end);
            }
        }

        if (containsAny(lower, "sáng nay", "sáng mai", "buổi sáng")) {
            return new TimeWindow(LocalTime.of(8, 0), LocalTime.of(11, 0));
        }
        if (containsAny(lower, "chiều nay", "chiều mai", "buổi chiều", "ca chiều")) {
            return new TimeWindow(LocalTime.of(14, 0), LocalTime.of(17, 0));
        }
        if (containsAny(lower, "tối nay", "tối mai", "buổi tối")) {
            return new TimeWindow(LocalTime.of(18, 0), LocalTime.of(21, 0));
        }
        return null;
    }

    private static int adjustHour(int hour, String period) {
        if (period == null) return hour;
        String p = period.toLowerCase(Locale.ROOT);
        if (("chiều".equals(p) || "tối".equals(p)) && hour >= 1 && hour <= 11) {
            return hour + 12;
        }
        if ("trưa".equals(p) && hour >= 1 && hour <= 10) {
            return hour + 12;
        }
        return hour;
    }

    private static boolean isValidClock(int hour, int minute) {
        return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
    }

    private static boolean containsAny(String input, String... keywords) {
        for (String kw : keywords) {
            if (input.contains(kw)) return true;
        }
        return false;
    }

    private record TimeWindow(LocalTime start, LocalTime end) {}

    public record ParsedQuery(
            String rawQuery,
            List<String> locations,
            BigDecimal minHourlyPrice,
            BigDecimal maxHourlyPrice,
            BigDecimal targetHourlyPrice,
            ResourceCategory resourceCategory,
            WorkspaceCategory workspaceCategory,
            Integer minCapacity,
            NoiseLevel noiseLevel,
            List<String> resourceTokens,
            List<String> amenityKeywords,
            LocalDateTime startTime,
            LocalDateTime endTime,
            boolean timeExplicit,
            boolean availabilityRequested,
            boolean wantsCheapest,
            boolean wantsTopRated
    ) {
        public boolean hasMultiFilterSearchIntent() {
            int signalCount = 0;
            if (!locations.isEmpty()) signalCount++;
            if (minHourlyPrice != null || maxHourlyPrice != null || targetHourlyPrice != null || wantsCheapest) signalCount++;
            if (startTime != null && endTime != null) signalCount++;
            if (!resourceTokens.isEmpty()) signalCount++;
            if (resourceCategory != null || minCapacity != null || noiseLevel != null || workspaceCategory != null) signalCount++;
            if (!amenityKeywords.isEmpty()) signalCount++;
            if (availabilityRequested) signalCount++;
            return signalCount >= 2 || availabilityRequested || !resourceTokens.isEmpty() || (startTime != null && endTime != null);
        }

        public boolean hasPriceFilter() {
            return minHourlyPrice != null || maxHourlyPrice != null || targetHourlyPrice != null;
        }
    }
}
