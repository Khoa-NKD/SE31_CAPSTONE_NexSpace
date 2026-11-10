package base.api.feature.auth.service.impl;

import base.api.shared.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Hashtable;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
public class EmailDeliverabilityValidator {

    private static final int SMTP_PORT = 25;
    private static final int TIMEOUT_MS = 4000;

    private static final Pattern EMAIL_SYNTAX_PATTERN =
            Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    /**
     * Danh sách các tên miền ví dụ, thử nghiệm hoặc email tạm thời không hợp lệ để tạo tài khoản thật.
     */
    private static final Set<String> BLOCKED_DOMAINS = Set.of(
            "example.com", "example.org", "example.net", "example.edu",
            "test.com", "test.org", "test.net",
            "invalid.com", "invalid.org",
            "fake.com", "sample.com", "dummy.com", "localhost",
            "tempmail.com", "mailinator.com", "10minutemail.com", "guerrillamail.com",
            "yopmail.com", "trashmail.com", "sharklasers.com", "dispostable.com",
            "throwawaymail.com", "temp-mail.org", "nada.ltd"
    );

    private record MxRecord(int priority, String host) {}

    /**
     * Xác thực tính khả dụng và tồn tại của địa chỉ email:
     * 1. Kiểm tra cú pháp chuẩn RFC
     * 2. Chặn các tên miền thử nghiệm (example.com, test.com...) và email rác/tạm thời
     * 3. Tra cứu DNS MX records, lọc bỏ Null MX (RFC 7505)
     * 4. Kiểm tra phân giải IP của máy chủ MX
     * 5. Xác thực hộp thư thực tế qua giao thức SMTP (hỗ trợ trực tiếp Gmail và các nhà cung cấp phổ biến)
     */
    public void validateEmailDeliverability(String email) {
        if (email == null || email.isBlank() || !EMAIL_SYNTAX_PATTERN.matcher(email.trim()).matches()) {
            throw new BadRequestException("Địa chỉ email không hợp lệ");
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String[] parts = normalizedEmail.split("@", 2);
        String username = parts[0];
        String domain = parts[1];

        // 1. Chặn các tên miền thử nghiệm / không có thật / email tạm thời
        if (BLOCKED_DOMAINS.contains(domain) || domain.endsWith(".test") || domain.endsWith(".invalid") || domain.endsWith(".example")) {
            log.warn("[EMAIL_VALIDATE] Từ chối đăng ký với tên miền thử nghiệm/tạm thời: {}", domain);
            throw new BadRequestException("Địa chỉ email không tồn tại hoặc thuộc tên miền không được hỗ trợ.");
        }

        // 2. Kiểm tra quy tắc riêng của Gmail nếu là tài khoản Google
        boolean isGmail = "gmail.com".equals(domain) || "googlemail.com".equals(domain);
        if (isGmail) {
            validateGmailUsernameRules(username);
        }

        // 3. Tra cứu bản ghi MX hợp lệ (bỏ qua Null MX - RFC 7505)
        List<String> validMxHosts = resolveValidMxHosts(domain);
        if (validMxHosts.isEmpty()) {
            log.warn("[EMAIL_VALIDATE] Tên miền {} không có máy chủ nhận thư (không có MX hoặc là Null MX)", domain);
            throw new BadRequestException("Tên miền email không tồn tại hoặc không thể nhận thư");
        }

        // 4. Kiểm tra phân giải IP của máy chủ MX chính
        String primaryMx = validMxHosts.get(0);
        try {
            InetAddress.getByName(primaryMx);
        } catch (Exception e) {
            log.warn("[EMAIL_VALIDATE] Không thể phân giải IP cho máy chủ MX {}: {}", primaryMx, e.getMessage());
            throw new BadRequestException("Máy chủ nhận thư của tên miền không tồn tại");
        }

        // 5. Xác thực hộp thư thực tế qua SMTP RCPT TO
        verifyMailboxViaSmtp(primaryMx, normalizedEmail, isGmail);
    }

    private void validateGmailUsernameRules(String username) {
        if (username.length() < 6 || username.length() > 30) {
            throw new BadRequestException("Tên người dùng Gmail phải có từ 6 đến 30 ký tự");
        }
        if (username.startsWith(".") || username.endsWith(".") || username.contains("..")) {
            throw new BadRequestException("Địa chỉ Gmail không đúng định dạng");
        }
        if (!username.matches("^[a-z0-9.]+$")) {
            throw new BadRequestException("Địa chỉ Gmail chỉ được chứa chữ cái, số và dấu chấm");
        }
    }

    private List<String> resolveValidMxHosts(String domain) {
        List<MxRecord> mxRecords = new ArrayList<>();
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[]{"MX"});
            Attribute attr = attrs.get("MX");
            if (attr == null || attr.size() == 0) {
                return List.of();
            }

            for (int i = 0; i < attr.size(); i++) {
                String val = (String) attr.get(i);
                if (val == null) continue;
                String[] parts = val.trim().split("\\s+");
                int priority = 0;
                String host;
                if (parts.length >= 2) {
                    try {
                        priority = Integer.parseInt(parts[0]);
                    } catch (NumberFormatException ignored) {}
                    host = parts[1].trim();
                } else if (parts.length == 1) {
                    host = parts[0].trim();
                } else {
                    continue;
                }

                if (host.endsWith(".")) {
                    host = host.substring(0, host.length() - 1);
                }

                // RFC 7505: Null MX record có host là "." hoặc rỗng biểu thị tên miền không nhận mail
                if (!host.isEmpty() && !".".equals(host)) {
                    mxRecords.add(new MxRecord(priority, host));
                }
            }
        } catch (NamingException e) {
            log.warn("[EMAIL_VALIDATE] Lỗi tra cứu DNS MX cho {}: {}", domain, e.getMessage());
            return List.of();
        }

        mxRecords.sort(Comparator.comparingInt(MxRecord::priority));
        return mxRecords.stream().map(MxRecord::host).toList();
    }

    private void verifyMailboxViaSmtp(String mxHost, String email, boolean isGmail) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(mxHost, SMTP_PORT), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            String banner = readResponse(reader);
            if (banner == null || !banner.startsWith("220")) {
                log.warn("[EMAIL_VALIDATE] Banner từ máy chủ MX {} không hợp lệ: {}", mxHost, banner);
                return;
            }

            sendCommand(writer, "HELO nexspace.vn");
            readResponse(reader);

            sendCommand(writer, "MAIL FROM:<verify@nexspace.vn>");
            readResponse(reader);

            sendCommand(writer, "RCPT TO:<" + email + ">");
            String rcptRes = readResponse(reader);

            sendCommand(writer, "QUIT");

            if (rcptRes != null && (rcptRes.startsWith("550") || rcptRes.startsWith("551") || rcptRes.startsWith("552") || rcptRes.startsWith("553") || rcptRes.startsWith("554"))) {
                log.warn("[EMAIL_VALIDATE] Máy chủ MX {} từ chối hộp thư {}: {}", mxHost, email, rcptRes);
                if (isGmail) {
                    throw new BadRequestException("Địa chỉ email không tồn tại trong hệ thống Gmail. Vui lòng kiểm tra lại.");
                } else {
                    throw new BadRequestException("Địa chỉ email không tồn tại hoặc không thể nhận thư. Vui lòng kiểm tra lại.");
                }
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            // Fail-open: Nếu đường truyền mạng chặn port 25 đối với máy chủ thứ 3 thì không chặn người dùng
            log.warn("[EMAIL_VALIDATE] Không thể xác thực SMTP trực tiếp tới máy chủ {} cho email {}: {}", mxHost, email, e.getMessage());
        }
    }

    private void sendCommand(BufferedWriter writer, String command) throws Exception {
        writer.write(command + "\r\n");
        writer.flush();
    }

    private String readResponse(BufferedReader reader) throws Exception {
        String line = reader.readLine();
        while (line != null && line.length() >= 4 && line.charAt(3) == '-') {
            line = reader.readLine();
        }
        return line;
    }
}
