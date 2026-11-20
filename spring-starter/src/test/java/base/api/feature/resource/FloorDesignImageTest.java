package base.api.feature.resource;

import static org.assertj.core.api.Assertions.*;
import base.api.feature.resource.dto.FloorDesign;
import base.api.feature.resource.service.FloorDesignImage;
import base.api.shared.exception.BadRequestException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class FloorDesignImageTest {
    private FloorDesign.ImageInput png() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 6, BufferedImage.TYPE_INT_ARGB), "png", output);
        return new FloorDesign.ImageInput("image/png", Base64.getEncoder().encodeToString(output.toByteArray()));
    }
    @Test void normalizesRasterAndDoesNotRetainImageInDraftRequest() throws Exception {
        var image = FloorDesignImage.normalize(png());
        assertThat(image.mimeType()).isEqualTo("image/png");
        assertThat(Base64.getDecoder().decode(image.base64())).startsWith((byte)137, (byte)80, (byte)78, (byte)71);
        var request = new FloorDesign.Propose("Arrange", "revision", FloorDesign.Scope.WORKSPACE,null,"vi",null,null,image);
        assertThat(request.withoutImage().image()).isNull();
        assertThat(request.withoutImage().prompt()).isEqualTo("Arrange");
    }
    @Test void rejectsSpoofedMimeAndInvalidPayload() throws Exception {
        assertThatThrownBy(() -> FloorDesignImage.normalize(new FloorDesign.ImageInput("image/jpeg",png().base64()))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> FloorDesignImage.normalize(new FloorDesign.ImageInput("image/png","not an image"))).isInstanceOf(BadRequestException.class);
        assertThat(FloorDesignImage.normalize(null)).isNull();
    }
    @Test void rejectsOversizedEncodedInputBeforeDecoding() {
        assertThatThrownBy(() -> FloorDesignImage.normalize(new FloorDesign.ImageInput("image/png","A".repeat(6990509)))).isInstanceOf(BadRequestException.class);
    }

    @Test void preservesFineDiagramLinesWhenSanitizingJpeg() throws Exception {
        var source = new BufferedImage(240, 160, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                source.setRGB(x, y, (x % 13 == 0 || y % 17 == 0) ? 0x343d68 : 0xffffff);
            }
        }
        var original = new ByteArrayOutputStream();
        var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (var output = ImageIO.createImageOutputStream(original)) {
            writer.setOutput(output);
            var params = writer.getDefaultWriteParam();
            params.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(0.98f);
            writer.write(null, new javax.imageio.IIOImage(source, null, null), params);
        } finally { writer.dispose(); source.flush(); }
        byte[] originalBytes = original.toByteArray();
        var normalized = FloorDesignImage.normalize(new FloorDesign.ImageInput("image/jpeg",
                Base64.getEncoder().encodeToString(originalBytes)));
        var expected = ImageIO.read(new java.io.ByteArrayInputStream(originalBytes));
        var actual = ImageIO.read(new java.io.ByteArrayInputStream(Base64.getDecoder().decode(normalized.base64())));
        var defaultEncoding = new ByteArrayOutputStream();
        ImageIO.write(expected, "jpeg", defaultEncoding);
        var defaultImage = ImageIO.read(new java.io.ByteArrayInputStream(defaultEncoding.toByteArray()));
        assertThat(actual.getWidth()).isEqualTo(240);
        assertThat(actual.getHeight()).isEqualTo(160);
        long error = 0, defaultError = 0;
        for (int y = 0; y < expected.getHeight(); y++) {
            for (int x = 0; x < expected.getWidth(); x++) {
                for (int shift : new int[] {0, 8, 16}) {
                    int delta = ((actual.getRGB(x, y) >> shift) & 255) - ((expected.getRGB(x, y) >> shift) & 255);
                    error += delta * delta;
                    int defaultDelta = ((defaultImage.getRGB(x, y) >> shift) & 255) - ((expected.getRGB(x, y) >> shift) & 255);
                    defaultError += defaultDelta * defaultDelta;
                }
            }
        }
        // Check visible fidelity rather than comparing file sizes or encoder implementation details.
        assertThat(error / (double) (240 * 160 * 3)).isLessThan(35);
        assertThat(error).isLessThan(defaultError);
        expected.flush(); actual.flush(); defaultImage.flush();
    }
}
