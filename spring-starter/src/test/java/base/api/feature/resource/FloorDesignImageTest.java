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
        assertThat(image.mimeType()).isEqualTo("image/jpeg");
        assertThat(Base64.getDecoder().decode(image.base64())).startsWith((byte)255, (byte)216, (byte)255);
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
}
