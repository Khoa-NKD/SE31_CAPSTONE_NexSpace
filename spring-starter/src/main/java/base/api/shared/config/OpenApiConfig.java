package base.api.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Value("${app.api-url:http://localhost:8080}")
    private String apiUrl;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NexSpace Platform API - Authentication & Identity Services")
                        .version("1.0.0")
                        .description("Tài liệu đặc tả API chuẩn OpenAPI 3.0 cho phân hệ Xác thực (Authentication), Phân quyền (Authorization), "
                                + "Quản lý phiên đăng nhập và Quản trị danh tính người dùng trong hệ sinh thái NexSpace.\n\n"
                                + "### Hướng dẫn kiểm thử bảo mật với JWT:\n"
                                + "1. Gọi `POST /api/auth/login` với tài khoản kiểm thử (mặc định: `admin` / `Admin@123`).\n"
                                + "2. Sao chép giá trị `token` từ đối tượng `data` trong phản hồi.\n"
                                + "3. Bấm nút **Authorize** màu xanh ở góc trên bên phải trang Swagger, dán token vào ô `Value` (hệ thống tự động thêm tiền tố Bearer).\n"
                                + "4. Thực hiện gọi thử các endpoint được bảo vệ như `/api/auth/me`, `/api/auth/change-password`, hoặc `/api/admin/users`.")
                        .contact(new Contact().name("NexSpace Engineering Team")))
                .servers(List.of(new Server().url(apiUrl).description("Máy chủ API cục bộ (Local Development Server)")))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME, new SecurityScheme()
                                .name(SECURITY_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME));
    }
}
