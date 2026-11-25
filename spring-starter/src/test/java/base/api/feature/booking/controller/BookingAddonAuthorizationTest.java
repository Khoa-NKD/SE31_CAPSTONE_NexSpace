package base.api.feature.booking.controller;

import base.api.feature.booking.dto.request.BookingAddonRequest;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.service.IBookingService;
import base.api.feature.payment.service.IRefundService;
import base.api.shared.security.CurrentUserProvider;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingAddonAuthorizationTest {
    private AnnotationConfigApplicationContext context;
    @BeforeEach void setUp() { context = new AnnotationConfigApplicationContext(Config.class); }
    @AfterEach void tearDown() { SecurityContextHolder.clearContext(); context.close(); }

    @Test void organizerCanSelectExtrasForTheirOwnCustomerBooking() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "customer",null,List.of(new SimpleGrantedAuthority("ROLE_ORGANIZER"))));
        var service = context.getBean(IBookingService.class);
        when(context.getBean(CurrentUserProvider.class).getCurrentUserId()).thenReturn(42L);
        when(service.updateAddons(42L,64L,List.of(4L))).thenReturn(BookingResponseDto.builder().id(64L).build());
        var response = context.getBean(BookingController.class).updateAddons(64L,new BookingAddonRequest(List.of(4L)));
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(service).updateAddons(42L,64L,List.of(4L));
    }
    @Test void anonymousCallerCannotSelectBookingExtras() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("test","anonymous",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertThatThrownBy(() -> context.getBean(BookingController.class).updateAddons(64L,new BookingAddonRequest(List.of(4L))))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(context.getBean(IBookingService.class));
    }
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean IBookingService bookingService() { return mock(IBookingService.class); }
        @Bean IRefundService refundService() { return mock(IRefundService.class); }
        @Bean CurrentUserProvider currentUserProvider() { return mock(CurrentUserProvider.class); }
        @Bean BookingController controller(IBookingService booking, IRefundService refund) { return new BookingController(booking,refund); }
    }
}
