package base.api.shared.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new UploadController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void organizerUploadLimitPreservesPayloadTooLargeContract() throws Exception {
        mvc.perform(post("/api/organizer/applications"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(413));
    }

    @Test
    void workspaceUploadLimitPreservesUpstreamBadRequestContract() throws Exception {
        mvc.perform(post("/api/media/upload"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").value("Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB)."));
    }

    @Test
    void missingMultipartDocumentReturnsBadRequest() throws Exception {
        mvc.perform(multipart("/test/required-document"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @RestController
    static class UploadController {
        @PostMapping({"/api/organizer/applications", "/api/media/upload"})
        void oversizedUpload() {
            throw new MaxUploadSizeExceededException(5 * 1024 * 1024);
        }

        @PostMapping("/test/required-document")
        void requiredDocument(@RequestPart("businessLicense") MultipartFile document) {
        }
    }
}
