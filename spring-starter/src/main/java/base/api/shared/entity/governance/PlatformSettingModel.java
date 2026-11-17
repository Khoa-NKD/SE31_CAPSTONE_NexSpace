package base.api.shared.entity.governance;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.SettingCategory;
import base.api.shared.enums.SettingValueType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Cấu hình nền tảng dạng key-value (thay Platform_Fee_Rule và các cột cấu hình bị bỏ).
 * Khoá gợi ý: booking_hold_minutes, check_in_lead_minutes, check_in_late_minutes, commission_percent,
 * service_fee_percent, service_fee_refundable, payout_hold_days, public_holidays (Json), otp_max_attempts,
 * otp_resend_seconds, otp_ttl_minutes, login_max_failed, login_lock_minutes, notification_max_retry,
 * sla_hours_by_priority (Json), max_upload_mb. Đổi cấu hình => ghi Audit_Log (old/new + lý do).
 */
@Getter
@Setter
@Entity
@Table(name = "platform_setting")
public class PlatformSettingModel {

    @Id
    @Column(name = "setting_key", length = 100)
    private String settingKey;

    @Column(name = "setting_value", nullable = false, columnDefinition = "TEXT")
    private String settingValue;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "value_type", nullable = false, length = 10)
    private SettingValueType valueType = SettingValueType.STRING;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private SettingCategory category;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserModel updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
