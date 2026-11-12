package base.api.shared.entity.organizer;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/** One immutable agreement snapshot per application; verification documents retain their own lifecycle. */
@Entity
@Table(name = "organizer_contract")
@Getter
@Setter
public class OrganizerContractModel extends BaseModel {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_profile_id", nullable = false, unique = true)
    private OrganizerProfileModel profile;
    @Column(nullable = false, unique = true, length = 80) private String contractNumber;
    @Column(nullable = false, length = 60) private String templateVersion;
    @Column(nullable = false, length = 30) private String status = "PENDING_SIGNATURE";
    @Column(nullable = false) private boolean demo;
    @Column(nullable = false) private LocalDateTime issuedAt;
    @Lob @Column(nullable = false, columnDefinition = "LONGTEXT") private String contentSnapshot;
    @Column(nullable = false, length = 64) private String contentHash;
    @Column(nullable = false, length = 80) private String originalPdfKey;
    @Column(length = 80) private String signedPdfKey;
    @Column(length = 64) private String signedPdfHash;
    @Column(nullable = false) private String signingEmail;
    private LocalDateTime signedAt;
    private Long signedBy;
    @Column(length = 100) private String otpHash;
    private LocalDateTime otpExpiresAt;
    private LocalDateTime otpSentAt;
    @Column(nullable = false) private int otpAttempts;
    private LocalDateTime otpWindowStart;
    @Column(nullable = false) private int otpWindowCount;
}
