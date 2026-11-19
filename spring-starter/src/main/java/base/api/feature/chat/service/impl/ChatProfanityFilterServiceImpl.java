package base.api.feature.chat.service.impl;

import base.api.feature.chat.repository.IChatBannedWordRepository;
import base.api.feature.chat.service.IChatProfanityFilterService;
import base.api.shared.entity.chat.ChatBannedWordModel;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatProfanityFilterServiceImpl implements IChatProfanityFilterService {

    private final IChatBannedWordRepository bannedWordRepository;

    private static final String DEFAULT_MASK = "***";
    private static final List<String> FALLBACK_WORDS = List.of(
            "địt mẹ", "đụ má", "đậu má", "chó đẻ", "thằng chó", "đồ chó", "con cặc", "mẹ kiếp", "cút mẹ",
            "địt", "đụ", "đù", "đm", "đcm", "dcm", "dkm", "đkm", "vcl", "vkl", "vloz", "lồn", "cặc",
            "buồi", "dái", "đĩ", "phò", "clgt", "cc", "fuck", "fucking", "shit", "bitch", "asshole",
            "bastard", "dick", "pussy"
    );

    private volatile Pattern compiledPattern;

    @PostConstruct
    public void init() {
        reloadBannedWords();
    }

    @Override
    public synchronized void reloadBannedWords() {
        try {
            List<ChatBannedWordModel> dbWords = bannedWordRepository.findByIsActiveTrue();
            List<String> words;
            if (dbWords != null && !dbWords.isEmpty()) {
                words = dbWords.stream()
                        .map(ChatBannedWordModel::getWord)
                        .map(String::trim)
                        .filter(w -> !w.isEmpty())
                        .collect(Collectors.toList());
            } else {
                words = new ArrayList<>(FALLBACK_WORDS);
            }

            // Sắp xếp các cụm từ dài trước, từ ngắn sau để ưu tiên thay thế cụm từ phức hợp
            words.sort(Comparator.comparingInt(String::length).reversed());

            if (words.isEmpty()) {
                compiledPattern = null;
                return;
            }

            String regexGroup = words.stream()
                    .map(Pattern::quote)
                    .collect(Collectors.joining("|"));

            // Phù hợp ranh giới từ tiếng Việt & ký tự đặc biệt/dấu câu
            String regex = "(?i)(?<=^|[\\s\\p{Punct}])(" + regexGroup + ")(?=[\\s\\p{Punct}]|$)";
            this.compiledPattern = Pattern.compile(regex, Pattern.UNICODE_CHARACTER_CLASS);

            log.info("ChatProfanityFilterService đã tải {} từ cấm vào In-Memory Cache", words.size());
        } catch (Exception e) {
            log.warn("Không thể tải danh sách từ cấm từ database, chuyển sang danh sách dự phòng: {}", e.getMessage());
            buildFallbackPattern();
        }
    }

    private void buildFallbackPattern() {
        List<String> words = new ArrayList<>(FALLBACK_WORDS);
        words.sort(Comparator.comparingInt(String::length).reversed());
        String regexGroup = words.stream().map(Pattern::quote).collect(Collectors.joining("|"));
        String regex = "(?i)(?<=^|[\\s\\p{Punct}])(" + regexGroup + ")(?=[\\s\\p{Punct}]|$)";
        this.compiledPattern = Pattern.compile(regex, Pattern.UNICODE_CHARACTER_CLASS);
    }

    @Override
    public String filterAndMask(String rawText) {
        if (rawText == null || rawText.isBlank() || compiledPattern == null) {
            return rawText;
        }

        Matcher matcher = compiledPattern.matcher(rawText);
        if (matcher.find()) {
            return matcher.replaceAll(DEFAULT_MASK);
        }
        return rawText;
    }

    @Override
    public boolean containsBannedWord(String rawText) {
        if (rawText == null || rawText.isBlank() || compiledPattern == null) {
            return false;
        }
        return compiledPattern.matcher(rawText).find();
    }
}
