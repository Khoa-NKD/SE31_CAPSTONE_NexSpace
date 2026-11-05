package base.api.feature.organizer.service;

import base.api.feature.organizer.repository.IBusinessTypeRepository;
import base.api.shared.entity.organizer.BusinessTypeModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusinessTypeServiceTest {
    @Mock IBusinessTypeRepository repository;
    @InjectMocks BusinessTypeService service;

    @Test void readsBothDatabaseLabelsAndOffersOnlySupportedCodes() {
        var type=new BusinessTypeModel();type.setCode("LIMITED_LIABILITY");type.setNameVi("Công ty trách nhiệm hữu hạn");type.setNameEn("Limited liability company");type.setSortOrder(20);
        when(repository.findByCodeInOrderBySortOrderAscIdAsc(argThat(codes -> codes.size()==5&&codes.containsAll(List.of("JOINT_STOCK","LIMITED_LIABILITY","SOLE_PROPRIETOR","HOUSEHOLD_BUSINESS","OTHER"))))).thenReturn(List.of(type));
        var result=service.list();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("LIMITED_LIABILITY");
        assertThat(result.get(0).nameVi()).isEqualTo(type.getNameVi());
        assertThat(result.get(0).nameEn()).isEqualTo(type.getNameEn());
        assertThat(result.get(0).sortOrder()).isEqualTo(20);
        verify(repository).findByCodeInOrderBySortOrderAscIdAsc(org.mockito.ArgumentMatchers.anyCollection());
        verifyNoMoreInteractions(repository);
    }
}
