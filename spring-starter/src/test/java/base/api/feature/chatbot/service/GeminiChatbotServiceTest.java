package base.api.feature.chatbot.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.chatbot.dto.request.ChatMessageItemDto;
import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.impl.GeminiChatbotServiceImpl;
import base.api.feature.governance.repository.IPlatformSettingRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceTypeRepository;
import base.api.feature.resource.repository.ResourceUsageRepository;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiChatbotServiceTest {

    private ObjectMapper objectMapper;
    private HttpClient httpClient;
    private GeminiChatbotServiceImpl chatbotService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        httpClient = mock(HttpClient.class);
        chatbotService = new GeminiChatbotServiceImpl(objectMapper, httpClient, "", "gemini-3.5-flash-lite");
    }

    @Test
    @DisplayName("Fallback response for greeting query returns greeting with step links and smart suggestions")
    void testGreetingFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Xin chào NexBot!")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("NexBot");
        assertThat(response.getReply()).contains("/workspaces");
        assertThat(response.isFallback()).isTrue();
        assertThat(response.getSuggestedQuestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Fallback response for booking query returns 6-step booking process with verified links")
    void testBookingProcessFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Làm sao để đặt chỗ bàn làm việc?")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).containsIgnoringCase("Quy trình Đặt chỗ tại NexSpace");
        assertThat(response.getReply()).contains("15 phút");
        assertThat(response.getReply()).contains("/workspaces");
        assertThat(response.getReply()).contains("/workspaces/review");
        assertThat(response.getReply()).contains("/workspaces/my-bookings");
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("Fallback response for temporary hold reads dynamic platform settings")
    void testTemporaryHoldFallbackUsesRuntimeSettings() {
        IPlatformSettingRepository settingsRepo = mock(IPlatformSettingRepository.class);
        PlatformSettingModel ttl = new PlatformSettingModel();
        ttl.setSettingKey("booking.hold_ttl_minutes");
        ttl.setSettingValue("15");
        when(settingsRepo.findById("booking.hold_ttl_minutes")).thenReturn(Optional.of(ttl));

        NexBotContextGrounder grounder = new NexBotContextGrounder(
                null, null, null, null, null, null, settingsRepo, null, null, null
        );
        GeminiChatbotServiceImpl groundedService = new GeminiChatbotServiceImpl(
                objectMapper, httpClient, "", "gemini-3.5-flash-lite", grounder
        );

        ChatbotResponseDto response = groundedService.chat(null, ChatbotRequestDto.builder()
                .message("Cơ chế giữ chỗ tạm thời hoạt động ra sao?")
                .build());

        assertThat(response.getReply()).contains("15 phút");
        assertThat(response.getReply()).contains("3 vị trí");
        assertThat(response.getReply()).contains("30 giây");
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("Nearby workspace fallback grounds on real DB workspaces and does not fabricate when empty")
    void testNearbyWorkspacesGroundedAndNoFabrication() {
        ChatbotResponseDto emptyDbResponse = chatbotService.chat(null, ChatbotRequestDto.builder()
                .message("Work space nào gần tôi nhất")
                .build());
        assertThat(emptyDbResponse.getReply()).contains("/workspaces");
        assertThat(emptyDbResponse.getReply()).doesNotContain("/workspaces/101");

        IWorkspaceRepository wsRepo = mock(IWorkspaceRepository.class);
        IBookableResourceRepository resRepo = mock(IBookableResourceRepository.class);
        IWorkspaceAmenityRepository amenityRepo = mock(IWorkspaceAmenityRepository.class);

        WorkspaceModel ws = new WorkspaceModel();
        ws.setId(42L);
        ws.setName("NexSpace Dragon Hub");
        ws.setAddress("15 An Nhơn 3");
        ws.setDistrict("Sơn Trà");
        ws.setCity("Đà Nẵng");
        ws.setCategory(WorkspaceCategory.COWORKING_HUB);
        ws.setStatus(WorkspaceStatus.ACTIVE);

        ResourceTypeModel rt = new ResourceTypeModel();
        rt.setId(7L);
        rt.setCategory(ResourceCategory.DESK);
        rt.setPricePerHour(new BigDecimal("45000"));
        rt.setActive(true);

        BookableResourceModel res = new BookableResourceModel();
        res.setId(99L);
        res.setLabel("D-01");
        res.setName("Focus Desk D-01");
        res.setResourceType(rt);
        res.setStatus(BookableResourceStatus.ACTIVE);

        AmenityModel monitor = new AmenityModel();
        monitor.setId(10L);
        monitor.setName("Màn hình rời 27 inch");
        monitor.setActive(true);
        WorkspaceAmenityModel wa = new WorkspaceAmenityModel();
        wa.setAmenity(monitor);
        wa.setAddonPricePerHour(new BigDecimal("30000"));

        when(wsRepo.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(wsRepo.findByStatus(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(resRepo.findByFloorPlanWorkspaceId(42L)).thenReturn(List.of(res));
        when(amenityRepo.findAllByWorkspaceId(42L)).thenReturn(List.of(wa));

        NexBotContextGrounder grounder = new NexBotContextGrounder(
                wsRepo, resRepo, mock(IResourceTypeRepository.class), mock(IWorkspaceOperatingHourRepository.class),
                amenityRepo, mock(IWorkspaceCancellationRuleRepository.class), null, null, null, null
        );
        GeminiChatbotServiceImpl groundedService = new GeminiChatbotServiceImpl(
                objectMapper, httpClient, "", "gemini-3.5-flash-lite", grounder
        );

        ChatbotResponseDto response = groundedService.chat(null, ChatbotRequestDto.builder()
                .message("Tìm không gian coworking ở Đà Nẵng")
                .build());

        assertThat(response.getReply()).contains("NexSpace Dragon Hub");
        assertThat(response.getReply()).contains("/workspaces/42");
        assertThat(response.getReply()).contains("45.000đ/giờ");
        assertThat(response.getReply()).contains("Màn hình rời 27 inch (+30.000đ/giờ)");
    }

    @Test
    @DisplayName("Authenticated user query returns personal booking and hold status")
    void testAuthenticatedUserBookingContext() {
        IUserRepository userRepo = mock(IUserRepository.class);
        IBookingRepository bookingRepo = mock(IBookingRepository.class);
        IOrganizerProfileRepository orgRepo = mock(IOrganizerProfileRepository.class);

        RoleModel role = new RoleModel();
        role.setName("USER");
        UserModel user = new UserModel();
        user.setId(5L);
        user.setFirstName("Minh");
        user.setLastName("Anh");
        user.setRoleEntity(role);

        WorkspaceModel ws = new WorkspaceModel();
        ws.setId(12L);
        ws.setName("Saigon Focus Lab");
        BookableResourceModel res = new BookableResourceModel();
        res.setId(33L);
        res.setLabel("A-05");
        BookingModel booking = new BookingModel();
        booking.setId(100L);
        booking.setBookingCode("BK-20261125-XYZ123");
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setWorkspace(ws);
        booking.setResource(res);
        booking.setStartTime(LocalDateTime.of(2026, 11, 26, 9, 0));
        booking.setEndTime(LocalDateTime.of(2026, 11, 26, 12, 0));
        booking.setFinalPrice(new BigDecimal("162000"));
        booking.setHoldExpiresAt(LocalDateTime.of(2026, 11, 25, 22, 55));

        OrganizerProfileModel profile = new OrganizerProfileModel();
        profile.setId(8L);
        profile.setStatus(OrganizerProfileStatus.APPROVED);

        when(userRepo.findById(5L)).thenReturn(Optional.of(user));
        when(bookingRepo.countActiveHoldsByCustomer(eq(5L), any(LocalDateTime.class))).thenReturn(1L);
        when(bookingRepo.findCustomerBookingsWithDetails(eq(5L), eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(booking)));
        when(orgRepo.findByOrganizerId(5L)).thenReturn(Optional.of(profile));

        NexBotContextGrounder grounder = new NexBotContextGrounder(
                null, null, null, null, null, null, null, userRepo, bookingRepo, orgRepo
        );
        GeminiChatbotServiceImpl groundedService = new GeminiChatbotServiceImpl(
                objectMapper, httpClient, "", "gemini-3.5-flash-lite", grounder
        );

        ChatbotResponseDto response = groundedService.chat(5L, ChatbotRequestDto.builder()
                .message("Đơn đặt chỗ của tôi hiện tại thế nào?")
                .build());

        assertThat(response.getReply()).contains("Minh Anh");
        assertThat(response.getReply()).contains("1 / 3");
        assertThat(response.getReply()).contains("BK-20261125-XYZ123");
        assertThat(response.getReply()).contains("Saigon Focus Lab");
        assertThat(response.getReply()).contains("/workspaces/my-bookings");
    }

    @Test
    @DisplayName("Organizer and refund fallbacks attach accurate verified portal links")
    void testOrganizerAndRefundLinks() {
        ChatbotResponseDto orgResponse = chatbotService.chat(null, ChatbotRequestDto.builder()
                .message("Tôi muốn đăng ký trở thành đối tác Organizer và ký hợp đồng")
                .build());
        assertThat(orgResponse.getReply()).contains("/organizer/apply");
        assertThat(orgResponse.getReply()).contains("/dashboard/organizer/application");
        assertThat(orgResponse.getReply()).contains("/dashboard/organizer/floorplan");
        assertThat(orgResponse.getReply()).contains("/dashboard/organizer/payouts");

        ChatbotResponseDto refundResponse = chatbotService.chat(null, ChatbotRequestDto.builder()
                .message("Làm sao để hủy đặt chỗ và hoàn tiền?")
                .build());
        assertThat(refundResponse.getReply()).contains("/workspaces/my-bookings");
        assertThat(refundResponse.getReply()).contains("PayOS Payout");
    }

    @Test
    @DisplayName("Gemini API call includes few-shot examples and live DB context in systemInstruction")
    @SuppressWarnings("unchecked")
    void testGeminiApiCallIncludesFewShotAndGrounding() throws Exception {
        IWorkspaceRepository wsRepo = mock(IWorkspaceRepository.class);
        WorkspaceModel ws = new WorkspaceModel();
        ws.setId(77L);
        ws.setName("Hanoi Creative Loft");
        ws.setAddress("88 Lý Thường Kiệt");
        ws.setCity("Hà Nội");
        ws.setStatus(WorkspaceStatus.ACTIVE);
        when(wsRepo.findByIdAndStatus(77L, WorkspaceStatus.ACTIVE)).thenReturn(Optional.of(ws));
        when(wsRepo.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(wsRepo.findByStatus(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));

        HttpResponse<String> mockHttpResponse = mock(HttpResponse.class);
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "Bạn có thể đặt chỗ tại [Hanoi Creative Loft](/workspaces/77) theo 6 bước." }
                        ]
                      }
                    }
                  ]
                }
                """);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockHttpResponse);

        NexBotContextGrounder grounder = new NexBotContextGrounder(wsRepo);
        GeminiChatbotServiceImpl geminiService = new GeminiChatbotServiceImpl(
                objectMapper, httpClient, "AIzaSyFakeKeyWithMoreThan20Chars123", "gemini-3.5-flash-lite", grounder
        );

        ChatbotResponseDto response = geminiService.chat(null, ChatbotRequestDto.builder()
                .message("Hướng dẫn đặt phòng ở Hanoi Creative Loft")
                .workspaceId(77L)
                .currentPath("/workspaces/77")
                .history(List.of(ChatMessageItemDto.builder().role("user").content("Chào bạn").build()))
                .build());

        assertThat(response.isFallback()).isFalse();
        assertThat(response.getReply()).contains("/workspaces/77");

        ArgumentCaptor<HttpRequest> reqCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(reqCaptor.capture(), any());
        assertThat(reqCaptor.getValue().headers().firstValue("x-goog-api-key"))
                .contains("AIzaSyFakeKeyWithMoreThan20Chars123");
    }

    @Test
    @DisplayName("Multi-condition Da Nang + 10.000đ + time + seat + availability query returns exact status and deep link")
    void testMultiConditionAvailabilityFallback() {
        IWorkspaceRepository wsRepo = mock(IWorkspaceRepository.class);
        IBookableResourceRepository resRepo = mock(IBookableResourceRepository.class);
        ResourceUsageRepository usageRepo = mock(ResourceUsageRepository.class);
        ICustomerReviewRepository reviewRepo = mock(ICustomerReviewRepository.class);
        IPricingRuleRepository pricingRepo = mock(IPricingRuleRepository.class);

        WorkspaceModel ws = new WorkspaceModel();
        ws.setId(1L);
        ws.setName("Campus Nest FPT City");
        ws.setAddress("Hoàng Đán, FPT City");
        ws.setDistrict("Ngũ Hành Sơn");
        ws.setCity("Đà Nẵng");
        ws.setCategory(WorkspaceCategory.COWORKING_HUB);
        ws.setStatus(WorkspaceStatus.ACTIVE);

        ResourceTypeModel rt = new ResourceTypeModel();
        rt.setId(10L);
        rt.setCategory(ResourceCategory.DESK);
        rt.setPricePerHour(new BigDecimal("10000"));
        rt.setActive(true);

        BookableResourceModel seat1 = new BookableResourceModel();
        seat1.setId(101L);
        seat1.setLabel("D-01");
        seat1.setName("Focus Desk D-01");
        seat1.setResourceType(rt);
        seat1.setStatus(BookableResourceStatus.ACTIVE);

        when(wsRepo.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(wsRepo.findByStatus(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(resRepo.findByFloorPlanWorkspaceId(1L)).thenReturn(List.of(seat1));
        when(pricingRepo.findByWorkspaceId(1L)).thenReturn(List.of());
        when(usageRepo.occupancyByWorkspace(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(java.util.Map.of());

        NexBotContextGrounder grounder = new NexBotContextGrounder(
                wsRepo, resRepo, mock(IResourceTypeRepository.class), mock(IWorkspaceOperatingHourRepository.class),
                mock(IWorkspaceAmenityRepository.class), mock(IWorkspaceCancellationRuleRepository.class),
                null, null, null, null
        ).withExtras(usageRepo, reviewRepo, pricingRepo);

        GeminiChatbotServiceImpl groundedService = new GeminiChatbotServiceImpl(
                objectMapper, httpClient, "", "gemini-3.5-flash-lite", grounder
        );

        ChatbotResponseDto availableRes = groundedService.chat(null, ChatbotRequestDto.builder()
                .message("muốn đặt nexspace tại đà nẵng giá 10.000 lúc 9h đến 11h ngày mai ghế số 1 có available không")
                .build());

        assertThat(availableRes.getReply()).contains("Campus Nest FPT City");
        assertThat(availableRes.getReply()).contains("D-01");
        assertThat(availableRes.getReply()).contains("AVAILABLE");
        assertThat(availableRes.getReply()).contains("21.600đ"); // 2h * 10.000 + 8% VAT
        assertThat(availableRes.getReply()).contains("/workspaces/seats?workspaceId=1&resourceId=101");

        // Now mark seat1 BOOKED
        when(usageRepo.occupancyByWorkspace(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(java.util.Map.of(101L, java.util.Set.of(AvailabilityState.BOOKED)));

        ChatbotResponseDto bookedRes = groundedService.chat(null, ChatbotRequestDto.builder()
                .message("muốn đặt nexspace tại đà nẵng giá 10.000 lúc 9h đến 11h ngày mai ghế số 1 có available không")
                .build());
        assertThat(bookedRes.getReply()).contains("BOOKED");
    }
}
