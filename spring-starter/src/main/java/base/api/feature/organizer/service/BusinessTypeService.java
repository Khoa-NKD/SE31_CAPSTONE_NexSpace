package base.api.feature.organizer.service;

import base.api.feature.organizer.dto.response.BusinessTypeResponse;
import base.api.feature.organizer.repository.IBusinessTypeRepository;
import base.api.shared.enums.BusinessType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessTypeService {
    private final IBusinessTypeRepository businessTypes;

    @Transactional(readOnly = true)
    public List<BusinessTypeResponse> list() {
        // Never offer codes that the existing submission/lifecycle rules do not support.
        var supported = Arrays.stream(BusinessType.values()).map(Enum::name).toList();
        return businessTypes.findByCodeInOrderBySortOrderAscIdAsc(supported).stream()
                .map(type -> new BusinessTypeResponse(type.getCode(), type.getNameVi(), type.getNameEn(), type.getSortOrder()))
                .toList();
    }
}
