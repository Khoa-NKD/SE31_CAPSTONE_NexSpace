package base.api.feature.organizer.service;

import java.io.*;
import java.text.Normalizer;
import java.util.ArrayList;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;

@Component
public class OrganizerContractPdf {
    /** Embed the bundled font so the Vietnamese agreement is readable on every client. */
    public byte[] render(String text) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream();
                InputStream fontStream = PDDocument.class.getResourceAsStream("/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf")) {
            if (fontStream == null) throw new IllegalStateException("Contract PDF font is unavailable");
            var font = PDType0Font.load(document, fontStream);
            var lines = new ArrayList<String>();
            for (String paragraph : Normalizer.normalize(text, Normalizer.Form.NFC).split("\\R", -1)) {
                String line = "";
                for (String word : paragraph.replaceAll("[\\p{Cc}&&[^\\n]]", " ").split(" +")) {
                    String candidate = line.isEmpty() ? word : line + " " + word;
                    if (!line.isEmpty() && font.getStringWidth(candidate) / 1000 * 10 > 490) {
                        lines.add(line); line = word;
                    } else { line = candidate; }
                }
                lines.add(line);
            }
            for (int offset = 0; offset < lines.size(); offset += 43) {
                var page = new PDPage(PDRectangle.A4); document.addPage(page);
                try (var stream = new PDPageContentStream(document, page)) {
                    stream.setNonStrokingColor(new java.awt.Color(30, 41, 59)); stream.beginText(); stream.setFont(font, 10);
                    stream.setLeading(17); stream.newLineAtOffset(52, 785);
                    for (int i = offset; i < Math.min(offset + 43, lines.size()); i++) {
                        stream.showText(lines.get(i)); stream.newLine();
                    }
                    stream.endText();
                }
            }
            document.getDocumentInformation().setTitle("NexSpace Organizer Cooperation Agreement — Local Demo");
            document.save(output); return output.toByteArray();
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException("Could not generate the contract PDF. Check the supported font and text.");
        }
    }
}
