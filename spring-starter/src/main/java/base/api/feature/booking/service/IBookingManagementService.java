package base.api.feature.booking.service;

import base.api.feature.booking.dto.response.AdminBookingItemResponseDTO;
import base.api.feature.booking.dto.response.AdminBookingKpiResponseDTO;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.BookingStatus;
import org.springframework.data.domain.Page;

public interface IBookingManagementService {

    Page<AdminBookingItemResponseDTO> getAdminBookings(BookingStatus status, String search, PageRequestDTO pageRequest);

    AdminBookingKpiResponseDTO getAdminBookingKpis();

    Page<AdminBookingItemResponseDTO> getOrganizerBookings(Long organizerId, BookingStatus status, String search, PageRequestDTO pageRequest);

    AdminBookingKpiResponseDTO getOrganizerBookingKpis(Long organizerId);
}
