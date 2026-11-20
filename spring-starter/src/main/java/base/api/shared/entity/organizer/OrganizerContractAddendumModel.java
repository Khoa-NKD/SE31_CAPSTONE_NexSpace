package base.api.shared.entity.organizer;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/** A separately consented correction, never an overwrite of the signed parent agreement. */
@Entity
@Table(name = "organizer_contract_addendum")
@Getter
@Setter
public class OrganizerContractAddendumModel extends BaseModel {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private OrganizerContractModel contract;
    @Column(nullable = false, length = 80) private String addendumNumber;
    @Column(nullable = false, length = 60) private String templateVersion;
    @Column(nullable = false, length = 30) private String status = "PENDING_SIGNATURE";
    @Column(nullable = false) private LocalDateTime issuedAt;
    @Column(nullable = false) private Long issuedBy;
    @Lob @Column(nullable = false, columnDefinition = "LONGTEXT") private String contentSnapshot;
    @Column(nullable = false, length = 64) private String contentHash;
    @Column(nullable = false, length = 64) private String baseSignedPdfHash;
    @Column(nullable = false, length = 80) private String originalPdfKey;
    @Column(nullable = false) private String signingEmail;
    private LocalDateTime signedAt;
    private Long signedBy;
    @Column(length = 80) private String signedPdfKey;
    @Column(length = 64) private String signedPdfHash;
    @Column(length = 100) private String otpHash;
    private LocalDateTime otpExpiresAt;
    private LocalDateTime otpSentAt;
    @Column(nullable = false) private int otpAttempts;
    private LocalDateTime otpWindowStart;
    @Column(nullable = false) private int otpWindowCount;
}
