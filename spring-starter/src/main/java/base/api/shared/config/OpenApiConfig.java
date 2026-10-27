package base.api.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  private static final String SECURITY_SCHEME = "bearerAuth";

  @Value("${app.api-url:http://localhost:8080}")
  private String apiUrl;

  @Bean
  public OpenAPI customOpenAPI() {
    return new OpenAPI()
        .info(
            new Info()
                .title("NexSpace API")
                .version("0.0.1-SNAPSHOT")
                .description(
                    "API cho nền tảng coworking NexSpace. **Public** = không cần JWT. "
                        + "Các endpoint còn lại cần header `Authorization: Bearer <token>`. "
                        + "Gọi POST /api/v1/auth/login, lấy data.accessToken rồi bấm Authorize "
                        + "và dán token (không thêm tiền tố Bearer)."))
        .servers(List.of(new Server().url(apiUrl)))
        .components(
            new Components()
                .addSecuritySchemes(
                    SECURITY_SCHEME,
                    new SecurityScheme()
                        .name(SECURITY_SCHEME)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
        .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME));
  }
}
