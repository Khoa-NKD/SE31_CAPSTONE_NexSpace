package base.api.feature.organizer.service;

import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.exception.BadRequestException;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

final class OrganizerIdentityImageCheck {
    private static final Semaphore RUNS = new Semaphore(2);
    private static final int MAX_PIXELS = 12_000_000;

    private OrganizerIdentityImageCheck() {}

    static void verify(OrganizerDocumentType type, byte[] bytes, String executable, String dataDirectory) {
        if (!RUNS.tryAcquire()) throw unavailable();
        try {
            var image = cleanImage(bytes);
            int side = classify(readText(image, executable, dataDirectory, "11"));
            if (side == 0) side = classify(readText(image, executable, dataDirectory, "6"));
            int expected = type == OrganizerDocumentType.ID_CARD_FRONT ? 1 : 2;
            if (side == 0) throw new BadRequestException("Could not recognize a readable Vietnamese identity card. Retake the photo");
            if (side != expected) throw new BadRequestException("The photo shows the other side of the identity card");
        } finally {
            RUNS.release();
        }
    }

    private static java.awt.image.BufferedImage cleanImage(byte[] bytes) {
        try (var input = new javax.imageio.stream.MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (Math.min(width, height) < 200 || (long) width * height > MAX_PIXELS) throw invalidImage();
                var image = reader.read(0);
                if (image == null) throw invalidImage();
                return image;
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw invalidImage();
        }
    }

    static List<String> command(String executable, String dataDirectory, String pageMode) {
        boolean windows = System.getProperty("os.name").startsWith("Windows");
        if (windows && "tesseract".equals(executable)) {
            String programFiles = System.getenv("ProgramW6432");
            if (programFiles == null) programFiles = System.getenv("ProgramFiles");
            if (programFiles != null) {
                Path installed = Path.of(programFiles, "Tesseract-OCR", "tesseract.exe");
                if (Files.isRegularFile(installed)) executable = installed.toString();
            }
        }
        // Windows processes may start without the user's environment overrides.
        if (dataDirectory.isBlank() && windows && System.getenv("TESSDATA_PREFIX") == null) {
            String localAppData = System.getenv("LOCALAPPDATA");
            Path localData = localAppData == null ? null : Path.of(localAppData, "NexSpace", "tessdata");
            if (!hasLanguagePacks(localData)) {
                localData = Path.of(System.getProperty("user.home"), "AppData", "Local", "NexSpace", "tessdata");
            }
            if (hasLanguagePacks(localData)) dataDirectory = localData.toString();
        }
        var command = new ArrayList<>(List.of(executable, "stdin", "stdout", "-l", "vie+eng", "--psm", pageMode));
        if (!dataDirectory.isBlank()) {
            command.add("--tessdata-dir");
            command.add(dataDirectory);
        }
        return command;
    }

    private static boolean hasLanguagePacks(Path directory) {
        return directory != null && Files.isRegularFile(directory.resolve("vie.traineddata"))
                && Files.isRegularFile(directory.resolve("eng.traineddata"));
    }

    private static String readText(java.awt.image.BufferedImage image, String executable, String dataDirectory, String pageMode) {
        Process process = null;
        try {
            process = new ProcessBuilder(command(executable, dataDirectory, pageMode))
                    .redirectError(ProcessBuilder.Redirect.DISCARD).start();
            Process running = process;
            var output = new java.util.concurrent.FutureTask<>(() -> {
                try (var stream = running.getInputStream()) { return stream.readNBytes(32 * 1024); }
            });
            var input = new java.util.concurrent.FutureTask<Void>(() -> {
                try (var stream = running.getOutputStream();
                     var imageOutput = new javax.imageio.stream.MemoryCacheImageOutputStream(stream)) {
                    ImageIO.write(image, "png", imageOutput);
                    imageOutput.flush();
                }
                return null;
            });
            startWorker(output);
            startWorker(input);
            if (!process.waitFor(12, TimeUnit.SECONDS) || process.exitValue() != 0) throw unavailable();
            input.get(1, TimeUnit.SECONDS);
            return new String(output.get(1, TimeUnit.SECONDS), StandardCharsets.UTF_8);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException | java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException ex) {
            throw unavailable();
        } finally {
            if (process != null && process.isAlive()) process.destroyForcibly();
        }
    }

    private static void startWorker(Runnable task) {
        var thread = new Thread(task, "organizer-identity-ocr");
        thread.setDaemon(true);
        thread.start();
    }

    static int classify(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT).replace('đ', 'd').replaceAll("[,;:]+", " ").replaceAll("\\s+", " ");
        boolean front = has(normalized, "can cuoc", "identity card")
                && has(normalized, "ho va ten", "ho chu dem va ten", "full name")
                && (has(normalized, "ngay sinh", "date of birth") || normalized.matches(".*(?<![0-9])[0-9]{12}(?![0-9]).*"));
        boolean back = hasVietnameseMrz(text) || (has(normalized, "ngay cap", "nam cap", "date of issue", "ngay thang nam")
                && has(normalized, "bo cong an", "ministry of public security", "dac diem nhan dang",
                        "noi dang ky khai sinh", "place of birth", "canh sat quan ly hanh chinh", "personal identification"));
        if (front == back) return 0;
        return front ? 1 : 2;
    }

    private static boolean hasVietnameseMrz(String text) {
        // OCR can split the country code or confuse I/D/M with visually similar characters.
        boolean identityLine = text.lines().map(line -> line.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9<]", ""))
                .anyMatch(line -> line.matches(".*[i1l][d0o<]vn[mn][0-9]{8,}[0-9a-z<]*"));
        return identityLine && text.replaceAll("[^a-zA-Z0-9<]", "").contains("<<<<");
    }

    private static boolean has(String text, String... markers) {
        for (String marker : markers) if (text.contains(marker)) return true;
        return false;
    }

    private static BadRequestException invalidImage() {
        return new BadRequestException("Upload a clear JPG or PNG identity card photo between 200 pixels per side and 12 megapixels");
    }

    private static OrganizerIdentityCheckUnavailableException unavailable() {
        return new OrganizerIdentityCheckUnavailableException();
    }
}
