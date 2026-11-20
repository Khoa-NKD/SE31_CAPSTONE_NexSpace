package base.api.feature.organizer.service;

import java.io.*;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.awt.Color;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;

@Component
public class OrganizerContractPdf {
    private static final Color INK = new Color(30, 41, 59);
    private static final Color BRAND = new Color(79, 70, 229);
    private record Line(String text, float size, float height, boolean heading) {}

    /** Embedded Vietnamese fonts, measured wrapping and reserved margins keep signing evidence readable on any client. */
    public byte[] render(String text) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream();
                InputStream fontStream = PDDocument.class.getResourceAsStream("/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf")) {
            if (fontStream == null) throw new IllegalStateException("Contract PDF font is unavailable");
            var font = PDType0Font.load(document, fontStream);
            var pages = new ArrayList<List<Line>>();
            var current = new ArrayList<Line>();
            float remaining = 682;
            String[] paragraphs = Normalizer.normalize(text, Normalizer.Form.NFC).split("\\R", -1);
            for (int index = 0; index < paragraphs.length; index++) {
                String paragraph = paragraphs[index].replaceAll("[\\p{Cc}]", " ").trim();
                boolean heading = !paragraph.isEmpty() && paragraph.length() < 160 &&
                        (index == 0 || paragraph.matches("^[0-9]+\\. .*$") ||
                         (paragraph.equals(paragraph.toUpperCase(Locale.ROOT)) && paragraph.matches(".*\\p{L}.*")));
                float size = index == 0 ? 15 : heading ? 11 : 10;
                float height = paragraph.isEmpty() ? 8 : heading ? 22 : 16;
                var wrapped = wrap(paragraph, font, size);
                for (String line : wrapped) {
                    if (remaining < height + (heading ? 32 : 0) && !current.isEmpty()) {
                        pages.add(current); current = new ArrayList<>(); remaining = 682;
                    }
                    current.add(new Line(line, size, height, heading));
                    remaining -= height;
                }
            }
            if (!current.isEmpty()) pages.add(current);
            for (int pageIndex = 0; pageIndex < pages.size(); pageIndex++) {
                var page = new PDPage(PDRectangle.A4); document.addPage(page);
                try (var stream = new PDPageContentStream(document, page)) {
                    stream.setNonStrokingColor(BRAND); stream.addRect(52, 794, 491, 3); stream.fill();
                    draw(stream, font, "NEXSPACE  /  HỢP ĐỒNG HỢP TÁC", 9, 52, 810, BRAND);
                    float y = 762;
                    for (Line line : pages.get(pageIndex)) {
                        if (!line.text().isEmpty()) draw(stream, font, line.text(), line.size(), 52, y, line.heading() ? BRAND : INK);
                        y -= line.height();
                    }
                    stream.setStrokingColor(new Color(219, 224, 233)); stream.moveTo(52, 52); stream.lineTo(543, 52); stream.stroke();
                    draw(stream, font, "Tài liệu riêng tư · Xác nhận điện tử OTP email", 8, 52, 37, INK);
                    draw(stream, font, "Trang " + (pageIndex + 1) + " / " + pages.size(), 8, 477, 37, INK);
                }
            }
            document.getDocumentInformation().setTitle("NexSpace Organizer Cooperation Agreement");
            document.getDocumentInformation().setAuthor("NexSpace");
            document.save(output); return output.toByteArray();
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException("Could not generate the contract PDF. Check the supported font and text.");
        }
    }

    private List<String> wrap(String text, PDType0Font font, float size) throws IOException {
        var lines = new ArrayList<String>();
        String line = "";
        for (String word : text.split(" +")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (!line.isEmpty() && font.getStringWidth(candidate) / 1000 * size > 491) {
                lines.add(line); line = "";
            }
            for (int offset = 0; offset < word.length();) {
                int codePoint = word.codePointAt(offset);
                String character = new String(Character.toChars(codePoint));
                String next = line + (offset == 0 && !line.isEmpty() ? " " : "") + character;
                if (!line.isEmpty() && font.getStringWidth(next) / 1000 * size > 491) {
                    lines.add(line); line = character;
                } else line = next;
                offset += Character.charCount(codePoint);
            }
        }
        lines.add(line);
        return lines;
    }

    private void draw(PDPageContentStream stream, PDType0Font font, String text, float size,
            float x, float y, Color color) throws IOException {
        stream.setNonStrokingColor(color); stream.beginText(); stream.setFont(font, size);
        stream.newLineAtOffset(x, y); stream.showText(text); stream.endText();
    }
}
