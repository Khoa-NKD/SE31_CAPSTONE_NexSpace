package base.api.shared.entity.personalization;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.BookingPurpose;
import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategoryPreference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Sở thích của khách (1-1 với user, PK = customer_id). Mảng quận / amenity lưu dạng JSON.
 */
@Getter
@Setter
@Entity
@Table(name = "customer_preference")
public class CustomerPreferenceModel implements Persistable<Long> {

    @Id
    @Column(name = "customer_id")
    private Long customerId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel customer;

    @Column(name = "districts_json", columnDefinition = "TEXT")
    private String districtsJson;

    @Column(name = "amenity_ids_json", columnDefinition = "TEXT")
    private String amenityIdsJson;

    @Column(name = "budget_min", precision = 18, scale = 2)
    private BigDecimal budgetMin;

    @Column(name = "budget_max", precision = 18, scale = 2)
    private BigDecimal budgetMax;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "resource_category", nullable = false, length = 10)
    private ResourceCategoryPreference resourceCategory = ResourceCategoryPreference.ANY;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "noise_level", length = 20)
    private NoiseLevel noiseLevel;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 30)
    private BookingPurpose purpose;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private boolean newRecord = false;

    @Override
    public Long getId() {
        return customerId;
    }

    @Override
    public boolean isNew() {
        return newRecord;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.newRecord = false;
    }
}
