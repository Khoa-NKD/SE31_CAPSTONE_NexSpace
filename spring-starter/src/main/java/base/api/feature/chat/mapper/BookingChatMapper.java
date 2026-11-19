package base.api.feature.chat.mapper;

import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.chat.BookingChatMessageModel;
import base.api.shared.entity.chat.BookingConversationModel;

public final class BookingChatMapper {

    private BookingChatMapper() {}

    public static BookingConversationResponseDTO toDto(BookingConversationModel model, Long callerId) {
        if (model == null) {
            return null;
        }

        UserModel customer = model.getCustomer();
        UserModel organizer = model.getOrganizer();

        int unread = 0;
        if (callerId != null) {
            if (callerId.equals(customer.getId())) {
                unread = model.getCustomerUnreadCount();
            } else if (callerId.equals(organizer.getId())) {
                unread = model.getOrganizerUnreadCount();
            }
        }

        return BookingConversationResponseDTO.builder()
                .id(model.getId())
                .bookingId(model.getBooking().getId())
                .bookingCode(model.getBooking().getBookingCode())
                .bookingStatus(model.getBooking().getStatus() != null ? model.getBooking().getStatus().name() : null)
                .workspaceId(model.getWorkspace().getId())
                .workspaceName(model.getWorkspace().getName())
                .workspaceAddress(model.getWorkspace().getAddress())
                .customerId(customer.getId())
                .customerName(getFullName(customer))
                .customerAvatarUrl(customer.getAvatar())
                .organizerId(organizer.getId())
                .organizerName(getFullName(organizer))
                .organizerAvatarUrl(organizer.getAvatar())
                .lastMessageAt(model.getLastMessageAt())
                .lastMessagePreview(model.getLastMessagePreview())
                .unreadCount(unread)
                .createdAt(model.getCreatedAt())
                .build();
    }

    public static BookingChatMessageResponseDTO toDto(BookingChatMessageModel model) {
        if (model == null) {
            return null;
        }

        UserModel sender = model.getSender();
        String roleName = sender.getRoleEntity() != null ? sender.getRoleEntity().getName() : null;

        return BookingChatMessageResponseDTO.builder()
                .id(model.getId())
                .conversationId(model.getConversation().getId())
                .senderId(sender.getId())
                .senderName(getFullName(sender))
                .senderRole(roleName)
                .senderAvatarUrl(sender.getAvatar())
                .messageType(model.getMessageType())
                .content(model.getContent())
                .attachmentUrl(model.getAttachmentUrl())
                .attachmentName(model.getAttachmentName())
                .isRead(model.isRead())
                .createdAt(model.getCreatedAt())
                .build();
    }

    private static String getFullName(UserModel user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String last = user.getLastName() != null ? user.getLastName().trim() : "";
        String full = (last + " " + first).trim();
        return !full.isEmpty() ? full : user.getUserName();
    }
}
