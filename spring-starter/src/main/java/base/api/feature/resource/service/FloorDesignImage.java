package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDesign;
import base.api.shared.exception.BadRequestException;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.Base64;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;

/** Decode only bounded raster images and strip metadata before sending request-scoped pixels. */
public final class FloorDesignImage {
    private FloorDesignImage() {}
    public static FloorDesign.ImageInput normalize(FloorDesign.ImageInput input) {
        if (input == null) return null;
        try {
            if (input.base64() == null || input.base64().length() > 6990508) throw invalid();
            byte[] bytes = Base64.getDecoder().decode(input.base64());
            if (bytes.length == 0 || bytes.length > 5 * 1024 * 1024) throw invalid();
            boolean png = bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[] {(byte)137,80,78,71,13,10,26,10});
            boolean jpeg = bytes.length >= 3 && bytes[0] == (byte)255 && bytes[1] == (byte)216 && bytes[2] == (byte)255;
            if (!(png && "image/png".equals(input.mimeType()) || jpeg && "image/jpeg".equals(input.mimeType()))) throw invalid();
            try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw invalid();
                var reader = readers.next();
                try {
                    reader.setInput(stream, true, true);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 1 || height < 1 || width > 10000 || height > 10000 || (long)width * height > 20000000) throw invalid();
                    var params = reader.getDefaultReadParam();
                    int sample = Math.max(1, (int)Math.ceil(Math.max(width, height) / 2000.0));
                    params.setSourceSubsampling(sample, sample, 0, 0);
                    var decoded = reader.read(0, params);
                    var clean = new BufferedImage(decoded.getWidth(), decoded.getHeight(), BufferedImage.TYPE_INT_RGB);
                    var graphics = clean.createGraphics();
                    try { graphics.setColor(Color.WHITE); graphics.fillRect(0,0,clean.getWidth(),clean.getHeight()); graphics.drawImage(decoded,0,0,null); }
                    finally { graphics.dispose(); decoded.flush(); }
                    var output = new ByteArrayOutputStream();
                    try { if (!ImageIO.write(clean, "jpeg", output)) throw invalid(); }
                    finally { clean.flush(); }
                    if (output.size() > 5 * 1024 * 1024) throw invalid();
                    return new FloorDesign.ImageInput("image/jpeg", Base64.getEncoder().encodeToString(output.toByteArray()));
                } finally { reader.dispose(); }
            }
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw invalid(); }
    }
    private static BadRequestException invalid() { return new BadRequestException("Use a valid JPG/PNG image up to 5 MB and 20 megapixels. WebP can be attached through the image picker."); }
}
