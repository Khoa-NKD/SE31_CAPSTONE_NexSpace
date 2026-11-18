package base.api.feature.analytics;

import base.api.feature.analytics.controller.OrganizerAnalyticsController;
import base.api.feature.analytics.repository.OrganizerAnalyticsRepository;
import base.api.feature.analytics.service.OrganizerAnalyticsService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Opt-in, read-only API verification against the existing local demo database.
 * Not a normal *Test class: execute explicitly with -Danalytics.demo.verify=true.
 * No JWT or stored credentials are exposed; the controller uses Spring's test security context.
 */
@SpringJUnitConfig(OrganizerAnalyticsLocalDemoCheck.Config.class)
public class OrganizerAnalyticsLocalDemoCheck {
    @Configuration @EnableMethodSecurity @EnableTransactionManagement
    @PropertySource({"classpath:application.properties", "file:src/main/resources/application-local.properties"})
    static class Config {
        @Bean DataSource dataSource(Environment env) {
            if (!Boolean.getBoolean("analytics.demo.verify")) throw new IllegalStateException("Local verification must be explicitly enabled");
            String url = env.getRequiredProperty("spring.datasource.url");
            if (!(url.startsWith("jdbc:mysql://localhost:3360/nexspace") || url.startsWith("jdbc:mysql://127.0.0.1:3360/nexspace"))) {
                throw new IllegalStateException("This check is restricted to the existing local NexSpace database");
            }
            return new DriverManagerDataSource(url,env.getRequiredProperty("spring.datasource.username"),env.getRequiredProperty("spring.datasource.password"));
        }
        @Bean NamedParameterJdbcTemplate jdbc(DataSource ds) { return new NamedParameterJdbcTemplate(ds); }
        @Bean DataSourceTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean OrganizerAnalyticsRepository repository(NamedParameterJdbcTemplate jdbc) { return new OrganizerAnalyticsRepository(jdbc); }
        @Bean OrganizerAnalyticsService service(OrganizerAnalyticsRepository repository) { return new OrganizerAnalyticsService(repository); }
        @Bean CurrentUserProvider currentUserProvider() { return new CurrentUserProvider(); }
        @Bean OrganizerAnalyticsController controller(OrganizerAnalyticsService service) { return new OrganizerAnalyticsController(service); }
    }
    @Autowired OrganizerAnalyticsController controller;
    @Autowired NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper json = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final Path artifacts = Path.of("..","artifacts","analytics-demo-20261118");

    @AfterEach void clearPrincipal() { SecurityContextHolder.clearContext(); }
    private void organizer(long id) {
        var role = new RoleModel(); role.setName("ORGANIZER");
        var user = new UserModel(); user.setId(id); user.setUserName("demo-verification"); user.setRoleEntity(role); user.setStatus(UserStatus.ACTIVE);
        var principal = new AuthUser(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
    private JsonNode fetch(MockMvc mvc, String path, String from, String to, String... extra) throws Exception {
        var request = get(path).param("from",from).param("to",to);
        for(int i=0;i<extra.length;i+=2) request.param(extra[i],extra[i+1]);
        var response = mvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).as(path).isEqualTo(200);
        return json.readTree(response.getContentAsString(StandardCharsets.UTF_8)).path("data");
    }
    private void summary(JsonNode expected, JsonNode actual) {
        expected.fields().forEachRemaining(field -> {
            assertThat(actual.has(field.getKey())).as(field.getKey()).isTrue();
            assertThat(new BigDecimal(actual.get(field.getKey()).asText())).as(field.getKey())
                    .isEqualByComparingTo(new BigDecimal(field.getValue().asText()));
        });
    }

    @Test void seededRecordsReconcileAcrossApiCardsChartsRankingsLedgerAndFilters() throws Exception {
        organizer(1);
        var mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.StringHttpMessageConverter(StandardCharsets.UTF_8),
                        new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(json)).build();
        var manifest = json.readTree(Files.readString(artifacts.resolve("expected.json")));
        // The only intentionally volatile fixture follows the real expiry scheduler.
        String pendingStatus=jdbc.getJdbcTemplate().queryForObject("SELECT status FROM booking WHERE booking_code='DEMO-AN261118-053'",String.class);
        assertThat(pendingStatus).isIn("PENDING_PAYMENT","EXPIRED");
        if (pendingStatus.equals("EXPIRED")) {
            assertThat(java.time.LocalDateTime.now()).isAfterOrEqualTo(java.time.LocalDateTime.parse(manifest.path("pendingExpiresAt").asText().replace(' ','T')));
            for(var range:manifest.path("ranges")) {
                if(range.at("/filter/from").asText().compareTo("2026-11-18")<=0 && range.at("/filter/to").asText().compareTo("2026-11-18")>=0) {
                    var counts=(com.fasterxml.jackson.databind.node.ObjectNode)range.path("statuses");
                    if(counts.path("PENDING_PAYMENT").asInt()>0) {
                        counts.put("PENDING_PAYMENT",counts.path("PENDING_PAYMENT").asInt()-1);
                        if(counts.path("PENDING_PAYMENT").asInt()==0) counts.remove("PENDING_PAYMENT");
                        counts.put("EXPIRED",counts.path("EXPIRED").asInt()+1);
                        var expectedSummary=(com.fasterxml.jackson.databind.node.ObjectNode)range.path("summary");
                        expectedSummary.put("expiredBookings",expectedSummary.path("expiredBookings").asLong()+1);
                    }
                }
            }
        }
        var saved = new ArrayList<JsonNode>();
        for(var expected : manifest.path("ranges")) {
            String from = expected.at("/filter/from").asText(), to=expected.at("/filter/to").asText();
            var actual = fetch(mvc,"/api/organizer/analytics",from,to);
            summary(expected.path("summary"),actual.path("current"));
            var previousTo=LocalDate.parse(from).minusDays(1);
            var previousFrom=LocalDate.parse(from).minusDays(ChronoUnit.DAYS.between(LocalDate.parse(from),LocalDate.parse(to))+1);
            for(var previous : manifest.path("ranges")) if(previous.at("/filter/from").asText().equals(previousFrom.toString()) && previous.at("/filter/to").asText().equals(previousTo.toString())) summary(previous.path("summary"),actual.path("previous"));
            Map<String,JsonNode> days = new LinkedHashMap<>();
            for(var day : actual.path("trends")) days.put(day.path("date").asText(),day);
            assertThat(days.size()).as("number of daily buckets").isEqualTo(expected.path("trends").size());
            expected.path("trends").fields().forEachRemaining(day -> summary(day.getValue(),days.get(day.getKey())));
            for(String dimension : new String[]{"workspaces","resourceTypes","resources"}) {
                var rankings=actual.path(dimension);
                if(expected.path("ledgerCount").asInt()>0) {
                    assertThat(rankings.size()).isEqualTo(1);
                    for(String key:new String[]{"paidBookings","receivedAmount","refundedAmount","netAmount"}) assertThat(new BigDecimal(rankings.get(0).path(key).asText())).as(dimension+"/"+key).isEqualByComparingTo(new BigDecimal(expected.path("summary").path(key).asText()));
                }
            }
            Map<String,String> heat = new LinkedHashMap<>();
            for(var cell : actual.path("heatmap")) heat.put(cell.path("dayOfWeek").asText()+"-"+cell.path("hour").asText(),cell.path("bookedHours").asText());
            assertThat(heat.size()).isEqualTo(expected.path("heatmap").size());
            expected.path("heatmap").fields().forEachRemaining(cell -> assertThat(new BigDecimal(heat.get(cell.getKey()))).as("heatmap "+cell.getKey()).isEqualByComparingTo(new BigDecimal(cell.getValue().asText())));
            var statuses=actual.path("statuses");
            for(var status:statuses) assertThat(status.path("count").asInt()).isEqualTo(expected.path("statuses").path(status.path("status").asText()).asInt());
            var ids = new HashSet<String>(); BigDecimal net=BigDecimal.ZERO;
            for(int page=1;;page++) {
                var ledger=fetch(mvc,"/api/organizer/analytics/ledger",from,to,"page",String.valueOf(page),"size","20");
                assertThat(ledger.path("total").asInt()).isEqualTo(expected.path("ledgerCount").asInt());
                for(var row:ledger.path("rows")) { assertThat(ids.add(row.path("eventId").asText())).isTrue(); net=net.add(new BigDecimal(row.path("amount").asText())); }
                if(page*20>=ledger.path("total").asInt())break;
            }
            assertThat(net).isEqualByComparingTo(expected.at("/summary/netAmount").asText());
            saved.add(actual);
        }
        var baseline=manifest.path("ranges").get(0);
        var desks=fetch(mvc,"/api/organizer/analytics","2026-10-20","2026-11-18","category","DESK");
        assertThat(desks.at("/current/paidBookings").asInt()).isZero();
        assertThat(desks.at("/current/bookedHours").asText()).isEqualTo("0.0000");
        var emptyFloor=fetch(mvc,"/api/organizer/analytics","2026-10-20","2026-11-18","workspaceId","18","floorNumber","1");
        assertThat(emptyFloor.at("/current/receivedAmount").asText()).isEqualTo("0.00");
        var roomFloor=fetch(mvc,"/api/organizer/analytics","2026-10-20","2026-11-18","workspaceId","18","floorNumber","2","resourceTypeId","38");
        summary(baseline.path("summary"),roomFloor.path("current"));
        var csv=mvc.perform(get("/api/organizer/analytics/export").param("from","2026-10-20").param("to","2026-11-18").accept("text/csv","application/json")).andReturn().getResponse();
        assertThat(csv.getStatus()).isEqualTo(200);
        assertThat(csv.getContentAsString(StandardCharsets.UTF_8).lines().count()).isEqualTo(baseline.path("ledgerCount").asLong()+1);
        Files.writeString(artifacts.resolve("verified-export.csv"),csv.getContentAsString(StandardCharsets.UTF_8));
        organizer(3);
        var other=fetch(mvc,"/api/organizer/analytics","2026-10-20","2026-11-18");
        assertThat(other.at("/current/receivedAmount").asText()).isEqualTo("0.00");
        assertThat(mvc.perform(get("/api/organizer/analytics").param("from","2026-10-20").param("to","2026-11-18").param("workspaceId","18")).andReturn().getResponse().getStatus()).isEqualTo(404);
        Files.writeString(artifacts.resolve("verified-api-reports.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(saved));
        Files.writeString(artifacts.resolve("expected-live.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(manifest));
    }
}
