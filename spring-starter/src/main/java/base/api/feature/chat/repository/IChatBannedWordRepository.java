package base.api.feature.chat.repository;

import base.api.shared.entity.chat.ChatBannedWordModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IChatBannedWordRepository extends JpaRepository<ChatBannedWordModel, Long> {

    List<ChatBannedWordModel> findByIsActiveTrue();

    Optional<ChatBannedWordModel> findByWordIgnoreCase(String word);

    boolean existsByWordIgnoreCase(String word);
}
