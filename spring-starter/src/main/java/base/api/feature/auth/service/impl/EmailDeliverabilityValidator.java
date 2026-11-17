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
import java.net.Inet4Address;
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
    private static final int TIMEOUT_MS = 3500;

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

    private static final List<String> GMAIL_FALLBACK_MX = List.of(
            "gmail-smtp-in.l.google.com",
            "alt1.gmail-smtp-in.l.google.com",
            "alt2.gmail-smtp-in.l.google.com",
            "alt3.gmail-smtp-in.l.google.com",
            "alt4.gmail-smtp-in.l.google.com"
    );

    public record SmtpResult(int code, String message) {}
    private record MxRecord(int priority, String host) {}

    @FunctionalInterface
    public interface SmtpProber {
        SmtpResult probe(InetAddress address, String email) throws Exception;
    }

    private final SmtpProber smtpProber;

    public EmailDeliverabilityValidator() {
        this(null);
    }

    public EmailDeliverabilityValidator(SmtpProber smtpProber) {
        this.smtpProber = smtpProber != null ? smtpProber : this::defaultProbeMailbox;
    }

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
            if (isGmail) {
                validMxHosts = GMAIL_FALLBACK_MX;
            } else {
                log.warn("[EMAIL_VALIDATE] Tên miền {} không có máy chủ nhận thư (không có MX hoặc là Null MX)", domain);
                throw new BadRequestException("Tên miền email không tồn tại hoặc không thể nhận thư");
            }
        }

        // 4. Kiểm tra phân giải IP của máy chủ MX
        boolean hasResolvableMx = false;
        for (String mxHost : validMxHosts) {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(mxHost);
                if (addresses != null && addresses.length > 0) {
                    hasResolvableMx = true;
                    break;
                }
            } catch (Exception ignored) {}
        }
        if (!hasResolvableMx) {
            log.warn("[EMAIL_VALIDATE] Không thể phân giải IP cho bất kỳ máy chủ MX nào của tên miền {}", domain);
            throw new BadRequestException("Máy chủ nhận thư của tên miền không tồn tại");
        }

        // 5. Xác thực hộp thư thực tế qua SMTP RCPT TO
        verifyMailboxViaSmtp(validMxHosts, normalizedEmail, isGmail);
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

    private void verifyMailboxViaSmtp(List<String> mxHosts, String email, boolean isGmail) {
        boolean connectionEstablished = false;

        for (String mxHost : mxHosts) {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(mxHost);
                // Ưu tiên kết nối IPv4 trước IPv6 để đảm bảo tốc độ và tránh blackhole cổng 25
                List<InetAddress> sortedAddresses = new ArrayList<>(List.of(addresses));
                sortedAddresses.sort((a, b) -> {
                    if (a instanceof Inet4Address && !(b instanceof Inet4Address)) return -1;
                    if (!(a instanceof Inet4Address) && b instanceof Inet4Address) return 1;
                    return 0;
                });

                for (InetAddress address : sortedAddresses) {
                    try {
                        SmtpResult result = smtpProber.probe(address, email);
                        if (result != null) {
                            connectionEstablished = true;
                            if (result.code() >= 500 && result.code() < 600) {
                                log.warn("[EMAIL_VALIDATE] Máy chủ MX {} ({}) từ chối hộp thư {}: {}",
                                        mxHost, address.getHostAddress(), email, result.message());
                                if (isGmail) {
                                    throw new BadRequestException(
                                            "Địa chỉ email không tồn tại trong hệ thống Gmail: 550 5.1.1 The email account that you tried to reach does not exist. Vui lòng kiểm tra lại.");
                                } else {
                                    throw new BadRequestException(
                                            "Địa chỉ email không tồn tại hoặc máy chủ từ chối nhận thư (mã phản hồi " + result.code() + "). Vui lòng kiểm tra lại.");
                                }
                            }
                            if (result.code() == 250 || result.code() == 251) {
                                log.info("[EMAIL_VALIDATE] Hộp thư {} tồn tại và hợp lệ trên máy chủ MX {} ({})",
                                        email, mxHost, address.getHostAddress());
                                return;
                            }
                        }
                    } catch (BadRequestException e) {
                        throw e;
                    } catch (Exception e) {
                        log.debug("[EMAIL_VALIDATE] Không thể kết nối tới {} ({}): {}", mxHost, address.getHostAddress(), e.getMessage());
                    }
                }
            } catch (BadRequestException e) {
                throw e;
            } catch (Exception e) {
                log.debug("[EMAIL_VALIDATE] Lỗi truy vấn địa chỉ máy chủ MX {}: {}", mxHost, e.getMessage());
            }
        }

        if (!connectionEstablished) {
            log.warn("[EMAIL_VALIDATE] Không thể kết nối SMTP trực tiếp tới các máy chủ MX cho email {}. Bỏ qua kiểm tra SMTP trực tiếp (Fail-open an toàn).", email);
        }
    }

    private SmtpResult defaultProbeMailbox(InetAddress address, String email) throws Exception {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(address, SMTP_PORT), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            SmtpResult banner = readSmtpResponse(reader);
            if (banner == null || banner.code() != 220) {
                return null;
            }

            sendCommand(writer, "HELO nexspace.vn");
            readSmtpResponse(reader);

            sendCommand(writer, "MAIL FROM:<verify@nexspace.vn>");
            readSmtpResponse(reader);

            sendCommand(writer, "RCPT TO:<" + email + ">");
            SmtpResult rcptRes = readSmtpResponse(reader);

            sendCommand(writer, "QUIT");
            return rcptRes;
        }
    }

    private void sendCommand(BufferedWriter writer, String command) throws Exception {
        writer.write(command + "\r\n");
        writer.flush();
    }

    private SmtpResult readSmtpResponse(BufferedReader reader) throws Exception {
        String line = reader.readLine();
        if (line == null) return null;
        StringBuilder sb = new StringBuilder(line);
        int code = 0;
        try {
            code = Integer.parseInt(line.substring(0, 3));
        } catch (Exception ignored) {}

        while (line != null && line.length() >= 4 && line.charAt(3) == '-') {
            line = reader.readLine();
            if (line != null) {
                sb.append(" ").append(line);
            }
        }
        return new SmtpResult(code, sb.toString());
    }
}
