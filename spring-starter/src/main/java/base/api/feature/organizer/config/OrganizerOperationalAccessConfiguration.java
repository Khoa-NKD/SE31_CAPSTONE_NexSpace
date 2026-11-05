package base.api.feature.organizer.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Suspension enforcement was retired; normal resource authorization remains in each controller/service. */
@Configuration
public class OrganizerOperationalAccessConfiguration implements WebMvcConfigurer {}
