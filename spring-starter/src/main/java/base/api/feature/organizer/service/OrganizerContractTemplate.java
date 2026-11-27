package base.api.feature.organizer.service;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.exception.ConflictException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.core.env.Environment;

/** Versioned OTP agreement content; supplied legal identity and approval evidence are captured, never fabricated. */
final class OrganizerContractTemplate {
    private OrganizerContractTemplate() {}

    static void requireConfiguration(Environment environment) {
        for (String field : new String[] {"legal-name", "tax-id", "address", "representative-name", "representative-title"})
            required(environment, field);
    }

    private static String required(Environment environment, String field) {
        String value = environment.getProperty("app.organizer.contract.platform." + field);
        if (value == null || value.isBlank())
            throw new ConflictException("Configure the platform legal identity before issuing an agreement: " + field);
        return clean(value);
    }

    static String render(OrganizerProfileModel profile, String number, LocalDateTime issuedAt,
            Environment environment, BigDecimal feePercent) {
        requireConfiguration(environment);
        var reviewer = profile.getReviewedBy();
        if (reviewer == null || profile.getReviewedAt() == null)
            throw new ConflictException("Administrator approval evidence is required before issuing an agreement");
        String reviewedAt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").format(profile.getReviewedAt()) + " UTC";
        return """
                HỢP ĐỒNG HỢP TÁC NỀN TẢNG NEXSPACE
                Mã hợp đồng: %s
                Phiên bản: NEXSPACE-OTP-1
                Phát hành: %s UTC

                A. THÔNG TIN CÁC BÊN
                BÊN NỀN TẢNG
                Tên pháp nhân: %s
                Mã số thuế: %s
                Địa chỉ: %s
                Người đại diện: %s
                Chức danh: %s

                BÊN ORGANIZER
                Tên pháp lý: %s
                Loại hình: %s
                Mã số thuế: %s
                Người đại diện: %s
                Địa chỉ: %s
                Liên hệ: %s — %s

                1. PHẠM VI HỢP TÁC
                Organizer cung cấp dịch vụ không gian làm việc, ghế và phòng; NexSpace cung cấp nền tảng đăng thông tin, quản lý đặt chỗ và thu tiền hộ. Hợp đồng này không thay thế từng đơn đặt chỗ của khách hàng.

                2. QUYỀN VÀ TRÁCH NHIỆM ORGANIZER
                Organizer xác nhận thẩm quyền đại diện và quyền cung cấp địa điểm; bảo đảm thông tin, giá, tiện ích, điều kiện phục vụ và lịch khả dụng chính xác. Organizer cung cấp dịch vụ theo đơn đã xác nhận, tiếp nhận phản ánh và phối hợp giải quyết các yêu cầu hoàn tiền có căn cứ.

                3. GIÁ, PHÍ VÀ THUẾ
                Khách thanh toán tiền dịch vụ và VAT theo hóa đơn đã xác nhận; không thu thêm phí dịch vụ nền tảng từ khách. Khoản NexSpace được hưởng là %s%% tổng giá trị hóa đơn đã bao gồm VAT. Cùng tỷ lệ này được áp dụng trên tiền dịch vụ chưa VAT (hoa hồng) và trên phần VAT của hóa đơn; không cộng thêm một khoản hoa hồng nữa vào tổng hóa đơn.
                Ví dụ minh họa ở mức phân chia 10%%: tiền dịch vụ 100.000 đồng, VAT 10.000 đồng, tổng hóa đơn 110.000 đồng. NexSpace nhận 11.000 đồng, gồm 10.000 đồng hoa hồng trên tiền dịch vụ và 1.000 đồng là 10%% của phần VAT; Organizer nhận 99.000 đồng. VAT trong ví dụ chỉ để minh họa phép chia, không thay đổi thuế suất được áp dụng trên từng đơn.
                Mức phí và các khoản tiền được chốt trên từng đơn; nội dung hợp đồng không tự sửa các giao dịch đã phát sinh. Các bên thực hiện nghĩa vụ hóa đơn, kê khai và thuế đối với khoản của mình. Phụ thu, khuyến mại và dịch vụ mua thêm chỉ áp dụng khi có cấu hình, công bố và xác nhận riêng.

                4. THU HỘ, HOÀN TIỀN VÀ ĐỐI SOÁT
                Khoản Organizer được hưởng là phần còn lại sau khoản phân chia cho NexSpace nêu tại mục 3 và các khoản hoàn được ghi nhận trên đơn. Chính sách hủy/hoàn đã công bố và được lưu trên đơn quyết định số tiền hoàn. VAT và phần nền tảng được điều chỉnh tương ứng với khoản hoàn; hoàn toàn bộ thì không thu phần nền tảng.
                Tiền được hưởng không đồng nghĩa tiền đã chuyển hoặc số dư được rút ngay. Việc chi trả được thực hiện sau khi xác định dịch vụ hoàn thành và xử lý các yêu cầu hoàn/tranh chấp liên quan; các bên đối soát bằng mã đơn và chứng từ chuyển khoản. Lịch chi trả cụ thể được xác lập riêng, không cam kết thời hạn chưa được cấu hình. Khoản hoàn phát sinh sau chi trả phải được ghi nhận để thu hồi hoặc bù trừ minh bạch.

                5. BẢO MẬT VÀ DỮ LIỆU
                Các bên bảo vệ tài khoản, thông tin khách hàng, giấy tờ và dữ liệu hợp đồng; chỉ truy cập, sử dụng và chia sẻ trong phạm vi có quyền và phục vụ hợp tác. Không cung cấp OTP cho người khác. Các bản PDF được cung cấp qua API kiểm tra quyền, không công khai đường dẫn lưu trữ.

                6. ĐIỀU CHỈNH, CHẤM DỨT VÀ TRANH CHẤP
                Thay đổi điều kiện hợp tác cần được thông báo và xác nhận theo quy trình được áp dụng; không tự sửa bản hợp đồng đã phát hành. Chấm dứt hợp tác không xóa nghĩa vụ thực hiện, hoàn tiền và đối soát của các đơn đã phát sinh. Các bên ưu tiên thương lượng; việc xử lý tiếp theo tuân theo pháp luật áp dụng.

                7. XÁC NHẬN ĐIỆN TỬ VÀ HIỆU LỰC
                NexSpace ghi nhận quyết định duyệt hồ sơ của quản trị viên dưới đây. Organizer đọc toàn bộ nội dung, xác nhận đồng ý và thẩm quyền đại diện, rồi nhập OTP gửi tới email tài khoản đã xác thực. Hệ thống kiểm tra OTP và lưu phiên bản, tài khoản, thời điểm cùng SHA-256 của bản PDF được chấp thuận. Hợp đồng chuyển trạng thái đã xác nhận khi bước này thành công.
                Đây là xác nhận điện tử qua tài khoản và OTP email; không phải chữ ký số có chứng thư của nhà cung cấp bên thứ ba. Việc duyệt hồ sơ được ghi nhận dưới danh nghĩa tài khoản quản trị, không tạo chữ ký giả của người đại diện pháp nhân.

                B. XÁC NHẬN PHÍA NỀN TẢNG
                Người duyệt hồ sơ: %s (tài khoản %s, ID %s)
                Thời điểm duyệt: %s
                Phương thức: Quyết định duyệt của quản trị viên có quyền trên NexSpace.
                Trạng thái: HỒ SƠ ĐÃ ĐƯỢC DUYỆT — CHỜ ORGANIZER XÁC NHẬN.

                C. XÁC NHẬN PHÍA ORGANIZER
                Người đại diện khai báo: %s
                Phương thức: Xác nhận đồng ý, thẩm quyền đại diện và OTP email.
                Trạng thái khi phát hành: CHỜ KÝ XÁC NHẬN.
                Sau khi ký, bản PDF bổ sung biên nhận ghi tài khoản, email, thời điểm và mã kiểm tra nội dung.
                """.formatted(clean(number), DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").format(issuedAt),
                required(environment, "legal-name"), required(environment, "tax-id"), required(environment, "address"),
                required(environment, "representative-name"), required(environment, "representative-title"),
                clean(profile.getLegalName()), businessLabel(profile), clean(profile.getTaxId()), clean(profile.getRepresentativeName()),
                clean(profile.getAddress()), clean(profile.getContactEmail()), clean(profile.getContactPhone()), feePercent.stripTrailingZeros().toPlainString(),
                clean((clean(reviewer.getFirstName()) + " " + clean(reviewer.getLastName())).trim().isEmpty()
                        ? reviewer.getUserName() : (clean(reviewer.getFirstName()) + " " + clean(reviewer.getLastName())).trim()),
                clean(reviewer.getUserName()), reviewer.getId(), reviewedAt, clean(profile.getRepresentativeName()));
    }

    static String renderDemo(OrganizerProfileModel profile, String number, LocalDateTime issuedAt,
            Environment environment, BigDecimal feePercent) {
        var demo = new org.springframework.core.env.StandardEnvironment();
        var values = new java.util.HashMap<String, Object>();
        String[] fields = {"legal-name", "tax-id", "address", "representative-name", "representative-title"};
        String[] defaults = {"305 NEXSPACE", "CHƯA CUNG CẤP — BẢN THỬ NGHIỆM", "Ngũ Hành Sơn, Đà Nẵng, Việt Nam", "Nguyễn Huy Vũ", "CEO"};
        for (int i = 0; i < fields.length; i++) {
            String key = "app.organizer.contract.platform." + fields[i];
            String configured = environment.getProperty(key);
            values.put(key, configured == null || configured.isBlank() ? defaults[i] : configured);
        }
        demo.getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("local-contract-preview", values));
        return "BẢN THỬ NGHIỆM LOCAL — KHÔNG DÙNG CHO GIAO DỊCH THỰC TẾ\n\n"
                + render(profile, number, issuedAt, demo, feePercent).replace("Phiên bản: NEXSPACE-OTP-1", "Phiên bản: LOCAL-DEMO-2");
    }

    private static String businessLabel(OrganizerProfileModel profile) {
        if (profile.getBusinessType() == null) return "Chưa cung cấp";
        return switch (profile.getBusinessType()) {
            case JOINT_STOCK -> "Công ty cổ phần";
            case LIMITED_LIABILITY -> "Công ty trách nhiệm hữu hạn";
            case SOLE_PROPRIETOR -> "Doanh nghiệp tư nhân";
            case HOUSEHOLD_BUSINESS -> "Hộ kinh doanh";
            case OTHER -> "Loại hình khác";
        };
    }

    private static String clean(String value) {
        return value == null ? "" : value.replaceAll("[\\p{Cc}]+", " ").trim();
    }
}
