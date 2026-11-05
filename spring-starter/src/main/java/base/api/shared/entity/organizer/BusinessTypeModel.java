package base.api.shared.entity.organizer;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Bilingual labels keyed by the existing stable business-type codes. */
@Getter
@Setter
@Entity
@Table(name = "business_type")
public class BusinessTypeModel extends BaseModel {
    @Column(nullable = false, unique = true, length = 30)
    private String code;
    @Column(name = "name_vi", nullable = false, length = 100)
    private String nameVi;
    @Column(name = "name_en", nullable = false, length = 100)
    private String nameEn;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
