package base.api.shared.entity.payment;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/**
 * Đợt chi trả/rút tiền của Organizer (Manual hoặc Auto-daily).
 */
@Getter
@Setter
@Entity
@Table(name = "organizer_withdrawal_batch", indexes = {
        @Index(name = "ix_withdrawal_batch_organizer", columnList = "organizer_id, status")
})
public class OrganizerWithdrawalBatchModel extends BaseModel {

    @Column(name = "batch_code", nullable = false, unique = true, length = 50)
    private String batchCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private UserModel organizer;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "payout_type", nullable = false, length = 20)
    private WithdrawalType payoutType;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private WithdrawalBatchStatus status = WithdrawalBatchStatus.PROCESSING;

    @Column(name = "bank_name", nullable = false, length = 100)
    private String bankName;

    @Column(name = "bank_bin", length = 20)
    private String bankBin;

    @Column(name = "bank_account_number", nullable = false, length = 100)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", nullable = false, length = 100)
    private String bankAccountHolder;

    @Column(name = "payos_reference", length = 100)
    private String payosReference;

    @Column(name = "error_reason", length = 500)
    private String errorReason;
}
