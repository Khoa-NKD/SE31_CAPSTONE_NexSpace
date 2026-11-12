package base.api.feature.booking.service.impl;

import base.api.feature.booking.dto.response.AdminBookingItemResponseDTO;
import base.api.feature.booking.dto.response.AdminBookingKpiResponseDTO;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.booking.service.IBookingManagementService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.enums.BookingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingManagementServiceImpl implements IBookingManagementService {

    private final IBookingRepository bookingRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "startTime", "endTime", "finalPrice", "status", "bookingCode"
    );

    @Override
    @Transactional(readOnly = true)
    public Page<AdminBookingItemResponseDTO> getAdminBookings(
            BookingStatus status,
            String search,
            PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS)
                : org.springframework.data.domain.PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));

        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<BookingModel> page = bookingRepository.findAdminBookings(status, normalizedSearch, pageable);

        return page.map(this::mapToAdminBookingItem);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingKpiResponseDTO getAdminBookingKpis() {
        long total = bookingRepository.count();
        long confirmed = bookingRepository.countByStatus(BookingStatus.CONFIRMED);
        long pending = bookingRepository.countByStatus(BookingStatus.PENDING_PAYMENT);
        long completed = bookingRepository.countByStatus(BookingStatus.COMPLETED);
        long cancelled = bookingRepository.countByStatus(BookingStatus.CANCELLED) + bookingRepository.countByStatus(BookingStatus.EXPIRED);

        return AdminBookingKpiResponseDTO.builder()
                .totalCount(total)
                .confirmedCount(confirmed)
                .pendingCount(pending)
                .completedCount(completed)
                .cancelledCount(cancelled)
                .totalRevenue(BigDecimal.ZERO)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminBookingItemResponseDTO> getOrganizerBookings(
            Long organizerId,
            BookingStatus status,
            String search,
            PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest != null
                ? pageRequest.toPageable("createdAt", Sort.Direction.DESC, ALLOWED_SORT_FIELDS)
                : org.springframework.data.domain.PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));

        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<BookingModel> page = bookingRepository.findOrganizerBookings(organizerId, status, normalizedSearch, pageable);

        return page.map(this::mapToAdminBookingItem);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminBookingKpiResponseDTO getOrganizerBookingKpis(Long organizerId) {
        long total = bookingRepository.countByWorkspaceOrganizerId(organizerId);
        long confirmed = bookingRepository.countByWorkspaceOrganizerIdAndStatus(organizerId, BookingStatus.CONFIRMED);
        long pending = bookingRepository.countByWorkspaceOrganizerIdAndStatus(organizerId, BookingStatus.PENDING_PAYMENT);
        long completed = bookingRepository.countByWorkspaceOrganizerIdAndStatus(organizerId, BookingStatus.COMPLETED);
        long cancelled = bookingRepository.countByWorkspaceOrganizerIdAndStatus(organizerId, BookingStatus.CANCELLED)
                + bookingRepository.countByWorkspaceOrganizerIdAndStatus(organizerId, BookingStatus.EXPIRED);

        return AdminBookingKpiResponseDTO.builder()
                .totalCount(total)
                .confirmedCount(confirmed)
                .pendingCount(pending)
                .completedCount(completed)
                .cancelledCount(cancelled)
                .totalRevenue(BigDecimal.ZERO)
                .build();
    }

    private AdminBookingItemResponseDTO mapToAdminBookingItem(BookingModel b) {
        String customerName = "Khách hàng";
        String customerEmail = "";
        String customerPhone = "";
        Long customerId = null;

        if (b.getCustomer() != null) {
            customerId = b.getCustomer().getId();
            customerEmail = b.getCustomer().getEmail() != null ? b.getCustomer().getEmail() : "";
            customerPhone = b.getCustomer().getPhone() != null ? b.getCustomer().getPhone() : "";
            String fn = b.getCustomer().getFirstName() != null ? b.getCustomer().getFirstName() : "";
            String ln = b.getCustomer().getLastName() != null ? b.getCustomer().getLastName() : "";
            String full = (fn + " " + ln).trim();
            customerName = !full.isEmpty() ? full : (b.getCustomer().getUserName() != null ? b.getCustomer().getUserName() : "Khách hàng");
        }

        String workspaceName = b.getWorkspace() != null ? b.getWorkspace().getName() : "NexSpace Hub";
        String workspaceAddress = b.getWorkspace() != null ? b.getWorkspace().getAddress() : "";
        Long workspaceId = b.getWorkspace() != null ? b.getWorkspace().getId() : null;

        Long resourceId = b.getResource() != null ? b.getResource().getId() : null;
        String resourceName = b.getResource() != null && b.getResource().getName() != null
                ? b.getResource().getName()
                : (b.getResource() != null && b.getResource().getLabel() != null ? b.getResource().getLabel() : "Desk");
        String resourceCategory = "HOT_DESK";
        if (b.getResource() != null && b.getResource().getResourceType() != null && b.getResource().getResourceType().getCategory() != null) {
            resourceCategory = b.getResource().getResourceType().getCategory().name();
        }
        String resourceZone = b.getResource() != null && b.getResource().getZoneName() != null
                ? b.getResource().getZoneName()
                : resourceName;

        return AdminBookingItemResponseDTO.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .customerId(customerId)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .workspaceId(workspaceId)
                .workspaceName(workspaceName)
                .workspaceAddress(workspaceAddress)
                .resourceId(resourceId)
                .resourceName(resourceName)
                .resourceCategory(resourceCategory)
                .resourceZone(resourceZone)
                .startTime(b.getStartTime())
                .endTime(b.getEndTime())
                .amount(b.getFinalPrice())
                .platformFee(b.getPlatformFeeAmount())
                .status(b.getStatus())
                .qrTokenHash(b.getQrTokenHash())
                .pinCode(b.getQrTokenHash() != null ? "8492" : null)
                .checkedInAt(b.getCheckedInAt())
                .checkedOutAt(b.getCheckedOutAt())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
