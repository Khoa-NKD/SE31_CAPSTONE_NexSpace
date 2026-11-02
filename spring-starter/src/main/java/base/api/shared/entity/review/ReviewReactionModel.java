package base.api.shared.entity.review;

import base.api.shared.entity.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Lượt "hữu ích" của khách trên 1 đánh giá.
 */
@Getter
@Setter
@Entity
@Table(name = "review_reaction")
public class ReviewReactionModel {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("reviewId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private CustomerReviewModel review;

    @MapsId("customerId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private UserModel customer;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "review_id")
        private Long reviewId;

        @Column(name = "customer_id")
        private Long customerId;
    }
}
