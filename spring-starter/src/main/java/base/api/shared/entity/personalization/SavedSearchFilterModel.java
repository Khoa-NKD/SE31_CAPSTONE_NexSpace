package base.api.shared.entity.personalization;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Entity
@Table(name = "saved_search_filter", uniqueConstraints = {
        @UniqueConstraint(name = "ux_saved_search_filter_name", columnNames = {"customer_id", "name"})
})
public class SavedSearchFilterModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel customer;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "criteria_json", nullable = false, columnDefinition = "TEXT")
    private String criteriaJson;
}
