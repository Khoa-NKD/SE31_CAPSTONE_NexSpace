package base.api.feature.chat.service;

public interface IChatProfanityFilterService {

    /**
     * Kiểm tra và che dấu (masking) các từ ngữ cấm/thô tục thành ký tự thay thế (ví dụ: ***).
     *
     * @param rawText Nội dung tin nhắn gốc
     * @return Nội dung tin nhắn đã được làm sạch và che từ cấm
     */
    String filterAndMask(String rawText);

    /**
     * Kiểm tra nhanh xem nội dung tin nhắn có chứa từ cấm nào không.
     *
     * @param rawText Nội dung tin nhắn
     * @return true nếu phát hiện có từ cấm
     */
    boolean containsBannedWord(String rawText);

    /**
     * Nạp lại (reload) danh sách từ cấm từ database vào In-Memory Cache.
     */
    void reloadBannedWords();
}
