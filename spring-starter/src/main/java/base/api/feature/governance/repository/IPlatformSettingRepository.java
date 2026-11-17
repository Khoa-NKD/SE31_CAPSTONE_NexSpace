package base.api.feature.governance.repository;

import base.api.shared.entity.governance.PlatformSettingModel;
import base.api.shared.enums.SettingCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IPlatformSettingRepository extends JpaRepository<PlatformSettingModel, String> {
    List<PlatformSettingModel> findByCategory(SettingCategory category);
}

