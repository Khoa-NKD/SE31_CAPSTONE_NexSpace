package base.api.feature.chat.service;

import base.api.feature.chat.repository.IChatBannedWordRepository;
import base.api.feature.chat.service.impl.ChatProfanityFilterServiceImpl;
import base.api.shared.entity.chat.ChatBannedWordModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatProfanityFilterServiceTest {

    @Mock
    private IChatBannedWordRepository bannedWordRepository;

    @InjectMocks
    private ChatProfanityFilterServiceImpl filterService;

    @BeforeEach
    void setUp() {
        List<ChatBannedWordModel> mockWords = List.of(
                ChatBannedWordModel.builder().word("địt mẹ").category("PROFANITY").build(),
                ChatBannedWordModel.builder().word("chó đẻ").category("PROFANITY").build(),
                ChatBannedWordModel.builder().word("vcl").category("PROFANITY").build(),
                ChatBannedWordModel.builder().word("fuck").category("PROFANITY").build(),
                ChatBannedWordModel.builder().word("cặc").category("PROFANITY").build()
        );
        when(bannedWordRepository.findByIsActiveTrue()).thenReturn(mockWords);
        filterService.reloadBannedWords();
    }

    @Test
    @DisplayName("filterAndMask - Che dấu chính xác các từ tục tĩu thành ***")
    void filterAndMask_masksProfanityCorrectly() {
        String input = "Cái này như chó đẻ, làm ăn như cặc vậy vcl!";
        String result = filterService.filterAndMask(input);

        assertThat(result).isEqualTo("Cái này như ***, làm ăn như *** vậy ***!");
    }

    @Test
    @DisplayName("filterAndMask - Không che các từ thông thường chứa ký tự trùng hợp (tránh Scunthorpe problem)")
    void filterAndMask_doesNotMaskInnocentWords() {
        // "bàn cờ", "chúc mừng", "phong cách" không bị che
        String input = "Bàn làm việc số 15 phong cách rất đẹp, chúc mừng bạn!";
        String result = filterService.filterAndMask(input);

        assertThat(result).isEqualTo(input);
    }

    @Test
    @DisplayName("filterAndMask - Không phân biệt chữ hoa, chữ thường và dấu câu tiếng Việt")
    void filterAndMask_caseInsensitiveAndPunctuation() {
        String input = "ĐỊT MẸ, FUCK this!";
        String result = filterService.filterAndMask(input);

        assertThat(result).isEqualTo("***, *** this!");
    }

    @Test
    @DisplayName("containsBannedWord - Phát hiện chính xác sự xuất hiện của từ cấm")
    void containsBannedWord_detectsCorrectly() {
        assertThat(filterService.containsBannedWord("xin chào bạn")).isFalse();
        assertThat(filterService.containsBannedWord("đồ chó đẻ")).isTrue();
    }
}
