package base.api.feature.organizer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

@Configuration
public class OrganizerApplicationConfiguration {
    @Bean
    public Clock organizerApplicationClock() {
        return Clock.systemUTC();
    }
}
