package base.api.feature.analytics;

import base.api.feature.analytics.dto.AnalyticsFilter;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository.Dimension;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import static org.assertj.core.api.Assertions.*;

/** Exercises real SQL with a disposable in-memory database; MySQL-specific JSON functions have explicit adapters. */
public class OrganizerAnalyticsRepositoryTest {
    private JdbcTemplate sql;
    private OrganizerAnalyticsRepository repository;
    private final boolean mysql = Boolean.getBoolean("analytics.test.mysql");
    private final AnalyticsFilter filter = new AnalyticsFilter(LocalDate.of(2026,11,1), LocalDate.of(2026,11,30), null, null, null, null);

    @BeforeEach
    void setUp() {
        // The opt-in integration target is deliberately fixed to a disposable test database.
        var ds = new DriverManagerDataSource(mysql
                ? "jdbc:mysql://127.0.0.1:3371/analytics_test?allowPublicKeyRetrieval=true&useSSL=false"
                : "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", mysql ? "root" : "sa", "");
        sql = new JdbcTemplate(ds);
        repository = new OrganizerAnalyticsRepository(new NamedParameterJdbcTemplate(ds));
        if (!mysql) {
        sql.execute("CREATE ALIAS JSON_VALID FOR 'base.api.feature.analytics.OrganizerAnalyticsRepositoryTest.jsonValid'");
        sql.execute("CREATE ALIAS JSON_EXTRACT FOR 'base.api.feature.analytics.OrganizerAnalyticsRepositoryTest.jsonExtract'");
        sql.execute("CREATE ALIAS JSON_UNQUOTE FOR 'base.api.feature.analytics.OrganizerAnalyticsRepositoryTest.jsonUnquote'");
        sql.execute("CREATE ALIAS WEEKDAY FOR 'base.api.feature.analytics.OrganizerAnalyticsRepositoryTest.weekday'");
        } else {
            assertThat(sql.queryForObject("SELECT VERSION()",String.class)).startsWith("8.4.");
        }
        sql.execute("CREATE TABLE workspace(id BIGINT PRIMARY KEY, organizer_id BIGINT, name VARCHAR(100))");
        sql.execute("CREATE TABLE floor_plan(id BIGINT PRIMARY KEY, workspace_id BIGINT, floor_number INT)");
        sql.execute("CREATE TABLE resource_type(id BIGINT PRIMARY KEY, workspace_id BIGINT, name VARCHAR(100), category VARCHAR(20))");
        sql.execute("CREATE TABLE bookable_resource(id BIGINT PRIMARY KEY, floor_plan_id BIGINT, resource_type_id BIGINT, name VARCHAR(100), parent_room_id BIGINT)");
        sql.execute("CREATE TABLE booking(id BIGINT PRIMARY KEY, booking_code VARCHAR(100), workspace_id BIGINT, resource_id BIGINT, customer_id BIGINT, status VARCHAR(20), created_at DATETIME(6), start_time DATETIME(6), end_time DATETIME(6), pricing_snapshot VARCHAR(1000), cancelled_at DATETIME(6), final_price DECIMAL(18,2), tax_amount DECIMAL(18,2), platform_fee_amount DECIMAL(18,2), service_fee_amount DECIMAL(18,2))");
        sql.execute("CREATE TABLE payment_transaction(id BIGINT PRIMARY KEY, booking_id BIGINT, status VARCHAR(20), paid_at DATETIME(6), received_amount DECIMAL(18,2), reconciliation_status VARCHAR(20), amount DECIMAL(18,2))");
        sql.execute("CREATE TABLE refund_request(id BIGINT PRIMARY KEY, booking_id BIGINT, payment_transaction_id BIGINT, status VARCHAR(20), processed_at DATETIME(6), approved_amount DECIMAL(18,2))");
        sql.execute("CREATE TABLE organizer_payout(id BIGINT PRIMARY KEY, organizer_id BIGINT, booking_id BIGINT, status VARCHAR(20), payout_amount DECIMAL(18,2), payout_reference VARCHAR(100), created_at DATETIME(6), paid_at DATETIME(6))");
        sql.update("INSERT INTO workspace VALUES(1,10,'Mine'),(2,20,'Other')");
        sql.update("INSERT INTO floor_plan VALUES(1,1,1),(2,2,1)");
        sql.update("INSERT INTO resource_type VALUES(1,1,'Room','ROOM'),(2,1,'Desk','DESK'),(3,2,'Other','ROOM')");
        sql.update("INSERT INTO bookable_resource VALUES(1,1,1,'Room A',NULL),(2,1,2,'Inside desk',1),(3,2,3,'Other',NULL)");
        booking(1,1,1,100,"CONFIRMED","2026-11-01 00:00:00","2026-10-31 23:30:00","2026-11-01 01:30:00");
        booking(2,1,1,101,"CANCELLED","2026-11-10 10:00:00","2026-11-10 11:00:00","2026-11-10 12:00:00");
        booking(3,2,3,102,"CONFIRMED","2026-11-10 10:00:00","2026-11-10 11:00:00","2026-11-10 12:00:00");
        receipt(1,1,"SUCCESS","2026-11-01 00:00:00","100000.25","MATCHED");
        receipt(2,1,"SUCCESS","2026-11-02 12:00:00","20000.50","MATCHED");
        receipt(3,1,"FAILED",null,null,"UNRECONCILED");
        receipt(4,2,"SUCCESS","2026-11-10 10:00:00","50000.00","MISMATCH");
        receipt(5,3,"SUCCESS","2026-11-10 10:00:00","999999.00","MATCHED");
        sql.update("INSERT INTO refund_request VALUES(1,1,1,'PROCESSED','2026-11-03 00:00:00',10000.10),(2,1,1,'PROCESSED','2026-11-04 00:00:00',20000.20),(3,1,1,'APPROVED',NULL,1000.00)");
    }

    @AfterEach void tearDown() {
        if (mysql) {
            for (String table : new String[]{"organizer_payout","refund_request","payment_transaction","booking","bookable_resource","resource_type","floor_plan","workspace"}) sql.execute("DROP TABLE IF EXISTS " + table);
        } else sql.execute("SHUTDOWN");
    }

    @Test void cashAndBookingsDoNotMultiplyAcrossRetriesAndPartialRefunds() {
        var report = repository.summary(10,filter);
        assertThat(report.receivedAmount()).isEqualTo("170000.75");
        assertThat(report.refundedAmount()).isEqualTo("30000.30");
        assertThat(report.netAmount()).isEqualTo("140000.45");
        assertThat(report.paidBookings()).isEqualTo(2);
        assertThat(report.payingCustomers()).isEqualTo(2);
        assertThat(report.receiptCount()).isEqualTo(3);
        assertThat(report.refundCount()).isEqualTo(2);
        assertThat(report.anomalousReceipts()).isEqualTo(1);
        assertThat(report.bookedHours()).isEqualTo("1.5000");
        assertThat(repository.duplicatePayments(10,filter)).isEqualTo(1);
    }

    @Test void periodIsHalfOpenAndOldBookingRefundCanMakeCashNegative() {
        var day = new AnalyticsFilter(LocalDate.of(2026,11,3),LocalDate.of(2026,11,3),null,null,null,null);
        var summary = repository.summary(10,day);
        assertThat(summary.paidBookings()).isZero();
        assertThat(summary.receivedAmount()).isEqualTo("0.00");
        assertThat(summary.refundedAmount()).isEqualTo("10000.10");
        assertThat(summary.netAmount()).isEqualTo("-10000.10");
        var firstDay = new AnalyticsFilter(LocalDate.of(2026,11,1),LocalDate.of(2026,11,1),null,null,null,null);
        assertThat(repository.summary(10,firstDay).receivedAmount()).isEqualTo("100000.25");
    }

    @Test void unpaidDeskInsideRoomDoesNotAddSalesOrHours() {
        booking(4,1,2,104,"PENDING_PAYMENT","2026-11-05 10:00:00","2026-11-05 11:00:00","2026-11-05 12:00:00");
        assertThat(repository.summary(10,filter).paidBookings()).isEqualTo(2);
        assertThat(repository.summary(10,filter).bookedHours()).isEqualTo("1.5000");
        assertThat(repository.rankings(10,filter,Dimension.RESOURCE)).hasSize(1);
    }

    @Test void summaryTrendsRankingsAndLedgerReconcile() {
        assertThat(repository.trends(10,filter).stream().map(t -> new java.math.BigDecimal(t.netAmount())).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)).isEqualByComparingTo("140000.45");
        for (var dimension : Dimension.values()) {
            assertThat(repository.rankings(10,filter,dimension)).singleElement().satisfies(r -> {
                assertThat(r.netAmount()).isEqualTo("140000.45"); assertThat(r.paidBookings()).isEqualTo(2);
            });
        }
        var ledger = repository.ledger(10,filter,1,20,null);
        assertThat(ledger.total()).isEqualTo(5);
        assertThat(ledger.rows().stream().map(r -> new java.math.BigDecimal(r.amount())).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)).isEqualByComparingTo("140000.45");
        assertThat(repository.ledger(10,filter,1,20,"REFUND").total()).isEqualTo(2);
        assertThat(repository.ledger(10,filter,2,2,null).rows()).hasSize(2);
    }

    @Test void ownersCannotReadAnotherWorkspaceAndAllQueriesRemainScoped() {
        assertThatThrownBy(() -> repository.requireOwnedWorkspace(10,2L)).isInstanceOf(NotFoundException.class);
        assertThat(repository.options(10).workspaces()).extracting(o -> o.id()).containsExactly(1L);
        assertThat(repository.summary(99,filter).receivedAmount()).isEqualTo("0.00");
        assertThat(repository.ledger(99,filter,1,20,null).rows()).isEmpty();
        assertThat(repository.rankings(99,filter,Dimension.WORKSPACE)).isEmpty();
        assertThat(repository.heatmap(99,filter)).isEmpty();
    }

    @Test void heatmapAllocatesPartialHoursAndClipsAtMidnight() {
        assertThat(repository.heatmap(10,filter)).hasSize(2).allSatisfy(cell -> assertThat(cell.dayOfWeek()).isEqualTo(7));
        var cells = repository.heatmap(10,filter);
        assertThat(cells.stream().map(c -> new java.math.BigDecimal(c.bookedHours())).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)).isEqualByComparingTo("1.5");
    }

    @Test void repeatedCustomersCountOnceAndPreviousPaymentIsNotANewBooking() {
        booking(4,1,1,100,"COMPLETED","2026-10-01 00:00:00","2026-10-01 00:00:00","2026-10-01 01:00:00");
        receipt(6,4,"SUCCESS","2026-10-01 00:00:00","1000.00","MATCHED");
        receipt(7,4,"SUCCESS","2026-11-20 00:00:00","2000.00","MATCHED");
        var summary = repository.summary(10,filter);
        assertThat(summary.paidBookings()).isEqualTo(2);
        assertThat(summary.returningCustomers()).isEqualTo(1);
        assertThat(summary.receivedAmount()).isEqualTo("172000.75");
    }

    @Test void invalidDatesAmountsAndUnknownRefundCurrencyAreVisibleAsExclusions() {
        receipt(6,1,"SUCCESS",null,"1.00","MATCHED");
        receipt(7,1,"FAILED",null,"2.00","MISMATCH");
        sql.update("UPDATE booking SET pricing_snapshot='{}' WHERE id=1");
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(4);
        assertThat(repository.summary(10,filter).refundedAmount()).isEqualTo("0.00");
    }

    @Test void categoryAndFloorFiltersApplyToEveryFinancialEvent() {
        var desk = new AnalyticsFilter(filter.from(),filter.to(),1L,1,2L,base.api.shared.enums.ResourceCategory.DESK);
        assertThat(repository.summary(10,desk).paidBookings()).isZero();
        assertThat(repository.ledger(10,desk,1,20,null).total()).isZero();
    }

    @Test void completeServiceReportAndCsvUseTheSameFinancialBasis() {
        var service = new base.api.feature.analytics.service.OrganizerAnalyticsService(repository);
        var report = service.report(10,filter);
        assertThat(report.current().netAmount()).isEqualTo("140000.45");
        assertThat(report.previous().receivedAmount()).isEqualTo("0.00");
        assertThat(report.notices()).anyMatch(n -> n.code().equals("MULTIPLE_SUCCESSFUL_PAYMENTS") && n.count()==1);
        sql.update("UPDATE workspace SET name = ? WHERE id=1", "=SUM(1,2)\nunsafe");
        assertThat(service.export(10,filter,null)).contains("\"'=SUM(1,2)\nunsafe\"");
        assertThatThrownBy(() -> service.ledger(10,filter,0,20,null)).isInstanceOf(base.api.shared.exception.BadRequestException.class);
    }

    private void booking(long id,long workspace,long resource,long customer,String status,String created,String start,String end) {
        sql.update("INSERT INTO booking(id,booking_code,workspace_id,resource_id,customer_id,status,created_at,start_time,end_time,pricing_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)",id,"BK-"+id,workspace,resource,customer,status,created,start,end,"{\"currency\":\"VND\"}");
    }
    @Test void paymentBeforeCancellationIsNotALatePaymentWarning() {
        sql.update("UPDATE payment_transaction SET reconciliation_status='MATCHED' WHERE id=4");
        sql.update("UPDATE booking SET cancelled_at='2026-11-10 12:00:00' WHERE id=2");
        assertThat(repository.summary(10,filter).anomalousReceipts()).isZero();
        sql.update("UPDATE booking SET cancelled_at='2026-11-10 09:00:00' WHERE id=2");
        assertThat(repository.summary(10,filter).anomalousReceipts()).isEqualTo(1);
    }
    private void receipt(long id,long booking,String status,String paid,String amount,String reconciliation) {
        sql.update("INSERT INTO payment_transaction VALUES(?,?,?,?,?,?,?)",id,booking,status,paid,amount,reconciliation,amount);
    }

    @Test void aZeroReceiptCannotCreateAPaidBookingAndOverpaymentNeedsReview() {
        booking(4,1,1,104,"CONFIRMED","2026-11-01 00:00:00","2026-11-01 02:00:00","2026-11-01 03:00:00");
        receipt(6,4,"SUCCESS","2026-11-01 00:00:00","0.00","MATCHED");
        sql.update("UPDATE payment_transaction SET amount=10 WHERE id=1");
        assertThat(repository.summary(10,filter).paidBookings()).isEqualTo(2);
        assertThat(repository.summary(10,filter).anomalousReceipts()).isEqualTo(2);
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(1);
    }
    @Test void futureSecondPaymentCannotCreateADuplicateWarningInAnEarlierPeriod() {
        long baseline=repository.duplicatePayments(10,filter);
        booking(4,1,1,104,"CONFIRMED","2026-10-01 00:00:00","2026-12-02 10:00:00","2026-12-02 11:00:00");
        receipt(6,4,"SUCCESS","2026-10-02 00:00:00","10000.00","MATCHED");
        receipt(7,4,"SUCCESS","2026-12-01 00:00:00","10000.00","MATCHED");
        assertThat(repository.duplicatePayments(10,filter)).isEqualTo(baseline);
    }
    @Test void negativeReceivedAmountOnAnUnsuccessfulPaymentIsNotSilentlyIgnored() {
        receipt(6,1,"FAILED",null,"-50.00","MISMATCH");
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(1);
    }
    @Test void averageBookingValueDoesNotDoubleWhenTheSameBookingIsPaidTwice() {
        assertThat(repository.summary(10,filter).averagePaidBookingValue()).isEqualTo("75000.13");
        sql.update("UPDATE payment_transaction SET received_amount=amount+10000 WHERE id=1");
        assertThat(repository.summary(10,filter).averagePaidBookingValue()).isEqualTo("75000.13");
    }
    @Test void refundedDuplicateIsInformationalOnlyAfterTheRefundIsProcessedWithinTheReport() {
        sql.update("UPDATE payment_transaction SET amount=100000.25,received_amount=100000.25 WHERE id=2");
        assertThat(repository.paymentReview(10,filter).unresolvedDuplicates()).isEqualTo(1);
        sql.update("INSERT INTO refund_request VALUES(4,1,2,'APPROVED',NULL,69999.95)");
        assertThat(repository.paymentReview(10,filter).unresolvedDuplicates()).isEqualTo(1);
        sql.update("UPDATE refund_request SET status='PROCESSED',processed_at='2026-12-01 00:00:00' WHERE id=4");
        assertThat(repository.paymentReview(10,filter).unresolvedDuplicates()).isEqualTo(1);
        sql.update("UPDATE refund_request SET processed_at='2026-11-10 10:00:00' WHERE id=4");
        assertThat(repository.paymentReview(10,filter).unresolvedDuplicates()).isZero();
        assertThat(repository.paymentReview(10,filter).refundedDuplicates()).isEqualTo(1);
        var report=new base.api.feature.analytics.service.OrganizerAnalyticsService(repository).report(10,filter);
        assertThat(report.notices()).noneMatch(n->n.code().equals("MULTIPLE_SUCCESSFUL_PAYMENTS"));
        assertThat(report.notices()).anyMatch(n->n.code().equals("DUPLICATE_PAYMENTS_REFUNDED")&&n.count()==1);
    }
    @Test void overRefundedPaymentIsFlaggedWithoutSilentlyClampingRecordedCash() {
        sql.update("INSERT INTO refund_request VALUES(4,1,1,'PROCESSED','2026-11-05 10:00:00',100000.00)");
        var review=repository.paymentReview(10,filter);
        assertThat(review.overRefundedPayments()).isEqualTo(1);
        assertThat(review.refundedDuplicates()).isZero();
        assertThat(repository.summary(10,filter).refundedAmount()).isEqualTo("130000.30");
        assertThat(repository.summary(10,filter).netAmount()).isEqualTo("40000.45");
    }
    @Test void unknownReceivedAmountIsMissingDataNotProofOfAnOverRefund() {
        sql.update("UPDATE payment_transaction SET received_amount=NULL WHERE id=1");
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(1);
        assertThat(repository.paymentReview(10,filter).overRefundedPayments()).isZero();
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(base.api.shared.enums.BookingStatus.class)
    void everyBookingStatusHasDefinedSalesAndReservedHourSemantics(base.api.shared.enums.BookingStatus status) {
        booking(4,1,1,104,status.name(),"2026-11-14 07:00:00","2026-11-15 10:00:00","2026-11-15 11:00:00");
        receipt(6,4,"SUCCESS","2026-11-14 08:00:00","10000.00","MATCHED");
        var summary=repository.summary(10,filter);
        assertThat(summary.paidBookings()).isEqualTo(3);
        assertThat(summary.receivedAmount()).isEqualTo("180000.75");
        boolean reserved=java.util.Set.of("CONFIRMED","CHECKED_IN","COMPLETED","NO_SHOW").contains(status.name());
        assertThat(summary.bookedHours()).isEqualTo(reserved?"2.5000":"1.5000");
        assertThat(summary.anomalousReceipts()).isEqualTo(reserved?1:2);
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(base.api.shared.enums.RefundStatus.class)
    void onlyProcessedRefundsAffectCash(base.api.shared.enums.RefundStatus status) {
        sql.update("INSERT INTO refund_request VALUES(4,1,1,?,'2026-11-05 10:00:00',5000.00)",status.name());
        assertThat(repository.summary(10,filter).refundedAmount()).isEqualTo(status==base.api.shared.enums.RefundStatus.PROCESSED?"35000.30":"30000.30");
    }
    @Test void microsecondIntervalsAreNotTruncatedBeforeTheTotalIsCalculated() {
        booking(4,1,1,104,"COMPLETED","2026-11-14 07:00:00","2026-11-15 10:00:00.100000","2026-11-15 10:00:00.900000");
        receipt(6,4,"SUCCESS","2026-11-14 08:00:00","10000.00","MATCHED");
        assertThat(repository.summary(10,filter).bookedHours()).isEqualTo("1.5002");
        assertThat(repository.heatmap(10,filter)).anyMatch(c->c.dayOfWeek()==7&&c.hour()==10&&c.bookedHours().equals("0.0002"));
    }
    @Test void totalsAcrossOwnedWorkspacesKeepCustomersDistinctAndRankingsScoped() {
        sql.update("INSERT INTO workspace VALUES(3,10,'Second mine')");
        sql.update("INSERT INTO floor_plan VALUES(3,3,5)");
        sql.update("INSERT INTO resource_type VALUES(4,3,'Second room','ROOM')");
        sql.update("INSERT INTO bookable_resource VALUES(4,3,4,'Room B',NULL)");
        booking(4,3,4,100,"COMPLETED","2026-11-14 07:00:00","2026-11-15 10:00:00","2026-11-15 11:00:00");
        receipt(6,4,"SUCCESS","2026-11-14 08:00:00","2000.00","MATCHED");
        assertThat(repository.summary(10,filter).payingCustomers()).isEqualTo(2);
        assertThat(repository.summary(10,filter).receivedAmount()).isEqualTo("172000.75");
        assertThat(repository.rankings(10,filter,Dimension.WORKSPACE)).extracting(r->r.id()).containsExactly(1L,3L);
        var scoped=new AnalyticsFilter(filter.from(),filter.to(),3L,5,4L,base.api.shared.enums.ResourceCategory.ROOM);
        assertThat(repository.summary(10,scoped).receivedAmount()).isEqualTo("2000.00");
        assertThat(repository.summary(10,scoped).bookedHours()).isEqualTo("1.0000");
    }
    @Test void tiedPaymentTimesPickOneDeterministicFirstPayment() {
        sql.update("UPDATE payment_transaction SET paid_at='2026-11-01 00:00:00' WHERE id=2");
        var report=repository.summary(10,filter);
        assertThat(report.paidBookings()).isEqualTo(2);
        assertThat(report.receiptCount()).isEqualTo(3);
        assertThat(report.averagePaidBookingValue()).isEqualTo("75000.13");
    }
    @Test void underpaidSuccessRecordDoesNotCountAsACompletelyPaidBooking() {
        booking(4,1,1,104,"CONFIRMED","2026-11-01 07:00:00","2026-11-15 10:00:00","2026-11-15 11:00:00");
        receipt(6,4,"SUCCESS","2026-11-02 08:00:00","90000.00","MISMATCH");
        sql.update("UPDATE payment_transaction SET amount=100000 WHERE id=6");
        var partialDay=new AnalyticsFilter(java.time.LocalDate.of(2026,11,2),java.time.LocalDate.of(2026,11,2),null,null,null,null);
        assertThat(repository.summary(10,partialDay).paidBookings()).isZero();
        assertThat(repository.summary(10,partialDay).receivedAmount()).isEqualTo("110000.50");
        receipt(7,4,"SUCCESS","2026-11-04 08:00:00","100000.00","MATCHED");
        var paidDay=new AnalyticsFilter(java.time.LocalDate.of(2026,11,4),java.time.LocalDate.of(2026,11,4),null,null,null,null);
        assertThat(repository.summary(10,paidDay).paidBookings()).isEqualTo(1);
        assertThat(repository.summary(10,paidDay).averagePaidBookingValue()).isEqualTo("100000.00");
    }
    @Test void endOfPeriodIsExclusiveEvenWithMicrosecondPrecision() {
        booking(4,1,1,104,"CONFIRMED","2026-11-30 23:59:59.999999","2026-12-01 10:00:00","2026-12-01 11:00:00");
        receipt(6,4,"SUCCESS","2026-11-30 23:59:59.999999","10000.00","MATCHED");
        assertThat(repository.summary(10,filter).receivedAmount()).isEqualTo("180000.75");
        sql.update("UPDATE payment_transaction SET paid_at='2026-12-01 00:00:00' WHERE id=6");
        assertThat(repository.summary(10,filter).receivedAmount()).isEqualTo("170000.75");
        assertThat(repository.summary(10,filter).createdBookings()).isEqualTo(3);
        assertThat(repository.summary(10,filter).bookedHours()).isEqualTo("1.5000");
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"USD","EUR","UNKNOWN"})
    void unknownRefundSettlementCurrencyNeverRevaluesReceipts(String currency) {
        sql.update("UPDATE booking SET pricing_snapshot=? WHERE id=1","{\"currency\":\""+currency+"\"}");
        assertThat(repository.summary(10,filter).receivedAmount()).isEqualTo("170000.75");
        assertThat(repository.summary(10,filter).refundedAmount()).isEqualTo("0.00");
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(2);
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"NEGATIVE","NO_AMOUNT","NO_DATE","WRONG_BOOKING"})
    void invalidProcessedRefundCannotEnterCashTotals(String fault) {
        sql.update("INSERT INTO refund_request VALUES(4,1,1,'PROCESSED','2026-11-05 10:00:00',5000.00)");
        if(fault.equals("NEGATIVE"))sql.update("UPDATE refund_request SET approved_amount=-5000 WHERE id=4");
        if(fault.equals("NO_AMOUNT"))sql.update("UPDATE refund_request SET approved_amount=NULL WHERE id=4");
        if(fault.equals("NO_DATE"))sql.update("UPDATE refund_request SET processed_at=NULL WHERE id=4");
        if(fault.equals("WRONG_BOOKING"))sql.update("UPDATE refund_request SET payment_transaction_id=4 WHERE id=4");
        assertThat(repository.summary(10,filter).refundedAmount()).isEqualTo("30000.30");
        assertThat(repository.invalidFinancialRecords(10,filter)).isEqualTo(1);
    }
    public static boolean jsonValid(String value) { try { return value != null && new ObjectMapper().readTree(value) != null; } catch(Exception e) { return false; } }
    public static String jsonExtract(String value,String path) throws Exception { return new ObjectMapper().readTree(value).path(path.substring(2)).toString(); }
    public static String jsonUnquote(String value) throws Exception { return new ObjectMapper().readTree(value).asText(); }
    public static int weekday(java.sql.Timestamp value) { return value.toLocalDateTime().getDayOfWeek().getValue()-1; }

    private void earningsFixture() {
        sql.update("DELETE FROM refund_request"); sql.update("DELETE FROM payment_transaction"); sql.update("DELETE FROM booking");
        booking(100,1,1,100,"CONFIRMED","2026-11-01 00:00:00","2026-11-02 09:00:00","2026-11-02 10:00:00");
        sql.update("UPDATE booking SET final_price=108000,tax_amount=8000,platform_fee_amount=10000,service_fee_amount=0 WHERE id=100");
        receipt(100,100,"SUCCESS","2026-11-01 10:00:00","108000","MATCHED");
    }
    @Test void organizerAllocationIncludesVatButSeparatesRentalIncomeAndActualTransfers() {
        earningsFixture();
        var result=repository.earnings(10,filter);
        assertThat(result.organizerAmount()).isEqualTo("98000.00");
        assertThat(result.rentalEarningsAmount()).isEqualTo("90000.00");
        assertThat(result.vatAmount()).isEqualTo("8000.00");
        assertThat(result.platformFeeAmount()).isEqualTo("10000.00");
        assertThat(result.transferTrackingAvailable()).isFalse(); assertThat(result.transferredAmount()).isNull();
        assertThat(repository.earnings(20,filter).organizerAmount()).isEqualTo("0.00");
        sql.update("INSERT INTO organizer_payout VALUES(1,10,100,'PAID',98000,'BANK-VERIFIED-1','2026-11-02 10:00:00','2026-11-03 10:00:00')");
        assertThat(repository.earnings(10,filter).transferredAmount()).isEqualTo("98000.00");
        assertThat(repository.earnings(20,filter).transferTrackingAvailable()).isFalse();
    }
    @Test void partialRefundReducesOriginalFeeAndDoesNotUseCurrentRates() {
        earningsFixture();
        sql.update("INSERT INTO refund_request VALUES(100,100,100,'PROCESSED','2026-11-03 10:00:00',54000)");
        var result=repository.earnings(10,filter);
        assertThat(result.organizerAmount()).isEqualTo("49000.00");
        assertThat(result.platformFeeAmount()).isEqualTo("5000.00"); assertThat(result.vatAmount()).isEqualTo("4000.00");
        sql.update("UPDATE booking SET platform_fee_amount=20000 WHERE id=100");
        assertThat(repository.earnings(10,filter).organizerAmount()).isEqualTo("44000.00");
    }
    @Test void duplicatePaymentsRemainUnallocatedAndMissingFeeCannotBecomeZero() {
        earningsFixture(); receipt(101,100,"SUCCESS","2026-11-02 10:00:00","108000","MATCHED");
        var result=repository.earnings(10,filter);
        assertThat(result.organizerAmount()).isEqualTo("98000.00"); assertThat(result.unallocatedAmount()).isEqualTo("108000.00");
        sql.update("UPDATE booking SET platform_fee_amount=NULL WHERE id=100");
        result=repository.earnings(10,filter);
        assertThat(result.organizerAmount()).isNull(); assertThat(result.validationIssues()).isPositive();
    }
    @Test void invalidTransferReferencesAreNotReportedAsMoneyActuallyReceived() {
        earningsFixture();
        sql.update("INSERT INTO organizer_payout VALUES(1,10,100,'PAID',98000,NULL,'2026-11-02 10:00:00','2026-11-03 10:00:00')");
        var result=repository.earnings(10,filter);
        assertThat(result.transferTrackingAvailable()).isTrue(); assertThat(result.transferredAmount()).isNull();
    }
}
