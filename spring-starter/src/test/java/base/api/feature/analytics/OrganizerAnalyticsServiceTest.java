package base.api.feature.analytics;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.feature.analytics.dto.OrganizerAnalyticsResponse.Ledger;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository;
import base.api.feature.analytics.service.OrganizerAnalyticsService;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizerAnalyticsServiceTest {
    @Mock OrganizerAnalyticsRepository repository;
    @InjectMocks OrganizerAnalyticsService service;
    final AnalyticsFilter filter=new AnalyticsFilter(LocalDate.of(2026,11,1),LocalDate.of(2026,11,30),null,null,null,null);
    @Test void largeExportsFailExplicitlyInsteadOfReturningTruncatedFinancialData() {
        when(repository.ledger(10,filter,1,50_000,null)).thenReturn(new Ledger(List.of(),50_001,1,50_000));
        assertThatThrownBy(()->service.export(10,filter,null)).isInstanceOf(BadRequestException.class).hasMessageContaining("50.000");
    }
    @ParameterizedTest @CsvSource({"0,20","1,0","1,101","100001,20"})
    void paginationIsBounded(int page,int size) {
        assertThatThrownBy(()->service.ledger(10,filter,page,size,null)).isInstanceOf(BadRequestException.class);
    }
    @Test void unknownEventKindsAreRejectedForLedgerAndExport() {
        assertThatThrownBy(()->service.ledger(10,filter,1,20,"ALL")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(()->service.export(10,filter,"ALL")).isInstanceOf(BadRequestException.class);
    }
}
