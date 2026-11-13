package base.api.feature.resource.service;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.ResourceOccupancyStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ResourceStateResolverTest {

    @Test
    @DisplayName("Tài nguyên null hoặc không ACTIVE phải trả về DISABLED")
    void resolve_WhenResourceNotActive_ShouldReturnDisabled() {
        var nullResult = ResourceStateResolver.resolve(null, Collections.emptyList(), Collections.emptyList(), LocalDateTime.now(), 1L);
        assertThat(nullResult.status()).isEqualTo(ResourceOccupancyStatus.DISABLED);

        var draftResource = new BookableResourceModel();
        draftResource.setStatus(BookableResourceStatus.DRAFT);
        var draftResult = ResourceStateResolver.resolve(draftResource, Collections.emptyList(), Collections.emptyList(), LocalDateTime.now(), 1L);
        assertThat(draftResult.status()).isEqualTo(ResourceOccupancyStatus.DISABLED);

        var disabledResource = new BookableResourceModel();
        disabledResource.setStatus(BookableResourceStatus.DISABLED);
        var disabledResult = ResourceStateResolver.resolve(disabledResource, Collections.emptyList(), Collections.emptyList(), LocalDateTime.now(), 1L);
        assertThat(disabledResult.status()).isEqualTo(ResourceOccupancyStatus.DISABLED);
    }

    @Test
    @DisplayName("Tài nguyên có khung giờ bị chặn phải trả về BLOCKED")
    void resolve_WhenHasBlockedSlots_ShouldReturnBlocked() {
        var resource = new BookableResourceModel();
        resource.setStatus(BookableResourceStatus.ACTIVE);

        var blockedSlot = new ResourceBlockedSlotModel();
        var result = ResourceStateResolver.resolve(resource, Collections.emptyList(), List.of(blockedSlot), LocalDateTime.now(), 1L);

        assertThat(result.status()).isEqualTo(ResourceOccupancyStatus.BLOCKED);
        assertThat(result.holdExpiresAt()).isNull();
        assertThat(result.isOccupiedByMe()).isFalse();
    }

    @Test
    @DisplayName("Tài nguyên có booking CONFIRMED phải trả về BOOKED và kiểm tra đúng quyền sở hữu")
    void resolve_WhenHasConfirmedBooking_ShouldReturnBooked() {
        var resource = new BookableResourceModel();
        resource.setStatus(BookableResourceStatus.ACTIVE);

        var customer = new UserModel();
        customer.setId(42L);

        var booking = new BookingModel();
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCustomer(customer);

        // Trường hợp người xem chính là người đặt
        var resultMe = ResourceStateResolver.resolve(resource, List.of(booking), Collections.emptyList(), LocalDateTime.now(), 42L);
        assertThat(resultMe.status()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(resultMe.isOccupiedByMe()).isTrue();

        // Trường hợp người xem là người khác
        var resultOther = ResourceStateResolver.resolve(resource, List.of(booking), Collections.emptyList(), LocalDateTime.now(), 99L);
        assertThat(resultOther.status()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(resultOther.isOccupiedByMe()).isFalse();

        // Trường hợp khách vãng lai (chưa đăng nhập - null)
        var resultAnonymous = ResourceStateResolver.resolve(resource, List.of(booking), Collections.emptyList(), LocalDateTime.now(), null);
        assertThat(resultAnonymous.status()).isEqualTo(ResourceOccupancyStatus.BOOKED);
        assertThat(resultAnonymous.isOccupiedByMe()).isFalse();
    }

    @Test
    @DisplayName("Tài nguyên có booking PENDING_PAYMENT còn hạn phải trả về HOLDING")
    void resolve_WhenHasActiveHoldBooking_ShouldReturnHolding() {
        var resource = new BookableResourceModel();
        resource.setStatus(BookableResourceStatus.ACTIVE);

        var customer = new UserModel();
        customer.setId(10L);

        var now = LocalDateTime.of(2026, 11, 13, 10, 0, 0);
        var holdExpiresAt = now.plusMinutes(10);

        var holdBooking = new BookingModel();
        holdBooking.setStatus(BookingStatus.PENDING_PAYMENT);
        holdBooking.setCustomer(customer);
        holdBooking.setHoldExpiresAt(holdExpiresAt);

        var result = ResourceStateResolver.resolve(resource, List.of(holdBooking), Collections.emptyList(), now, 10L);

        assertThat(result.status()).isEqualTo(ResourceOccupancyStatus.HOLDING);
        assertThat(result.holdExpiresAt()).isEqualTo(holdExpiresAt);
        assertThat(result.isOccupiedByMe()).isTrue();
    }

    @Test
    @DisplayName("Tài nguyên có booking PENDING_PAYMENT nhưng đã hết hạn phải trả về AVAILABLE")
    void resolve_WhenHoldIsExpired_ShouldReturnAvailable() {
        var resource = new BookableResourceModel();
        resource.setStatus(BookableResourceStatus.ACTIVE);

        var customer = new UserModel();
        customer.setId(10L);

        var now = LocalDateTime.of(2026, 11, 13, 10, 0, 0);
        var expiredHoldAt = now.minusMinutes(1);

        var expiredBooking = new BookingModel();
        expiredBooking.setStatus(BookingStatus.PENDING_PAYMENT);
        expiredBooking.setCustomer(customer);
        expiredBooking.setHoldExpiresAt(expiredHoldAt);

        var result = ResourceStateResolver.resolve(resource, List.of(expiredBooking), Collections.emptyList(), now, 10L);

        assertThat(result.status()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(result.holdExpiresAt()).isNull();
        assertThat(result.isOccupiedByMe()).isFalse();
    }

    @Test
    @DisplayName("Tài nguyên không có booking hay block slot nào cản trở phải trả về AVAILABLE")
    void resolve_WhenNoOverlap_ShouldReturnAvailable() {
        var resource = new BookableResourceModel();
        resource.setStatus(BookableResourceStatus.ACTIVE);

        var result = ResourceStateResolver.resolve(resource, Collections.emptyList(), Collections.emptyList(), LocalDateTime.now(), 1L);

        assertThat(result.status()).isEqualTo(ResourceOccupancyStatus.AVAILABLE);
        assertThat(result.holdExpiresAt()).isNull();
        assertThat(result.isOccupiedByMe()).isFalse();
    }
}

