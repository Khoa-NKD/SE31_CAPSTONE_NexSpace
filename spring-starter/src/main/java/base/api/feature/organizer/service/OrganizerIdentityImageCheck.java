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
        var reading = inspect(bytes, executable, dataDirectory);
        int expected = type == OrganizerDocumentType.ID_CARD_FRONT ? 1 : 2;
        if (reading.side() != expected) throw new BadRequestException("The photo shows the other side of the identity card");
    }

    private record Reading(int side, String number) {}

    private static Reading inspect(byte[] bytes, String executable, String dataDirectory) {
        if (!RUNS.tryAcquire()) throw new OrganizerIdentityCheckUnavailableException("Identity photo checking is busy. Wait a moment and retry.");
        try {
            var image = cleanImage(bytes);
            String text = readText(image, executable, dataDirectory, "11");
            int side = classify(text);
            if (side == 0 || identityNumber(text, side) == null) {
                String second = readText(image, executable, dataDirectory, "6");
                if (side == 0) side = classify(second);
                text += "\n" + second;
            }
            if (side == 0) throw unreadable(text);
            return new Reading(side, identityNumber(text, side));
        } finally {
            RUNS.release();
        }
    }

    static boolean verifyPair(byte[] first, byte[] second, String executable, String dataDirectory) {
        var a = inspect(first, executable, dataDirectory);
        var b = inspect(second, executable, dataDirectory);
        if (a.side() == b.side())
            throw new BadRequestException("Both identity photos show the same side. Keep one photo and choose the other side.");
        requireSameNumber(a.number(), b.number());
        return a.side() == 1;
    }

    static void requireSameNumber(String first, String second) {
        if (first == null || second == null)
            throw new BadRequestException("Could not compare the identity numbers. Retake the front number and the back machine-readable lines clearly.");
        if (!first.equals(second))
            throw new BadRequestException("These identity photos have different identity numbers. Keep one photo and upload the matching side of the same person's card.");
    }

    /** Compare only a unique, readable 12-digit number, never names or an OCR guess. Numbers never leave the server. */
    static String identityNumber(String text, int side) {
        if (text == null) return null;
        var candidates = new java.util.HashSet<String>();
        for (String line : text.lines().toList()) {
            String compact = line.toUpperCase(Locale.ROOT).replaceAll("[\\t \\u00a0]", "");
            // TD1 line 1 contains a nine-character document number and its check
            // digit before the optional field containing the full Vietnamese NID.
            // Taking twelve digits immediately after VNM mixes unrelated fields.
            var pattern = side == 2
                    ? java.util.regex.Pattern.compile("(?<![A-Z0-9<])[I1L][D0O<]VN[MN]([0-9]{9})([0-9])([0-9]{12})<<[0-9<](?![A-Z0-9<])")
                    : java.util.regex.Pattern.compile("(?<![0-9])([0-9]{12})(?![0-9])");
            var matcher = pattern.matcher(compact);
            while (matcher.find()) {
                if (side == 2) {
                    if (!validDocumentCheckDigit(matcher.group(1), matcher.group(2).charAt(0))) return null;
                    candidates.add(matcher.group(3));
                } else candidates.add(matcher.group(1));
            }
        }
        return candidates.size() == 1 ? candidates.iterator().next() : null;
    }

    private static boolean validDocumentCheckDigit(String digits, char checkDigit) {
        int[] weights = {7, 3, 1};
        int sum = 0;
        for (int index = 0; index < digits.length(); index++)
            sum += (digits.charAt(index) - '0') * weights[index % weights.length];
        return sum % 10 == checkDigit - '0';
    }

    private static java.awt.image.BufferedImage cleanImage(byte[] bytes) {
        try (var input = new javax.imageio.stream.MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (Math.min(width, height) < 200)
                    throw new BadRequestException("The identity photo resolution is too low. Upload a larger clear photo with all four corners visible.");
                if ((long) width * height > MAX_PIXELS)
                    throw new BadRequestException("The identity photo exceeds 12 megapixels. Resize it and upload again.");
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
        if (System.getProperty("os.name").startsWith("Mac")) {
            // GUI-launched IDEs often omit Homebrew from PATH on both Apple Silicon and Intel Macs.
            for (String prefix : List.of("/opt/homebrew", "/usr/local")) {
                Path binary = Path.of(prefix, "bin", "tesseract");
                if ("tesseract".equals(executable) && Files.isExecutable(binary)) executable = binary.toString();
                Path languageData = Path.of(prefix, "share", "tessdata");
                if (dataDirectory.isBlank() && System.getenv("TESSDATA_PREFIX") == null && hasLanguagePacks(languageData))
                    dataDirectory = languageData.toString();
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
            if (!dataDirectory.isBlank() && !hasLanguagePacks(Path.of(dataDirectory)))
                throw processFailure("Failed loading language");
            process = new ProcessBuilder(command(executable, dataDirectory, pageMode))
                    .start();
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
            var diagnostic = new java.util.concurrent.FutureTask<>(() -> {
                try (var stream = running.getErrorStream()) { return stream.readNBytes(16 * 1024); }
            });
            startWorker(output);
            startWorker(input);
            startWorker(diagnostic);
            if (!process.waitFor(12, TimeUnit.SECONDS)) throw timedOut();
            if (process.exitValue() != 0)
                throw processFailure(new String(diagnostic.get(1, TimeUnit.SECONDS), StandardCharsets.UTF_8));
            input.get(1, TimeUnit.SECONDS);
            return new String(output.get(1, TimeUnit.SECONDS), StandardCharsets.UTF_8);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException | java.nio.file.InvalidPathException ex) {
            throw new OrganizerIdentityCheckUnavailableException("Identity photo checking is not configured on this server. Contact support.");
        } catch (java.util.concurrent.TimeoutException ex) {
            throw timedOut();
        } catch (java.util.concurrent.ExecutionException ex) {
            throw processFailure("");
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
        return new BadRequestException("The identity photo could not be opened. Upload an undamaged JPG or PNG file.");
    }

    static BadRequestException unreadable(String text) {
        if (text == null || text.isBlank())
            return new BadRequestException("No readable text was found on the identity photo. Retake it in focus, avoid glare and include all four corners.");
        return new BadRequestException("The identity card details could not be read completely. The photo may be blurred, obscured or cropped. Retake the correct side with all four corners visible.");
    }

    static OrganizerIdentityCheckUnavailableException processFailure(String diagnostic) {
        String detail = diagnostic.toLowerCase(Locale.ROOT);
        if (detail.contains("failed loading language") || detail.contains("error opening data file")
                || detail.contains("couldn't load any languages"))
            return new OrganizerIdentityCheckUnavailableException("Identity photo checking is missing required language data on this server. Contact support.");
        return new OrganizerIdentityCheckUnavailableException("Identity photo checking failed to process this image. Retry or contact support.");
    }

    private static OrganizerIdentityCheckUnavailableException timedOut() {
        return new OrganizerIdentityCheckUnavailableException("Identity photo checking took too long. Retry with a smaller clear photo.");
    }

    private static OrganizerIdentityCheckUnavailableException unavailable() {
        return new OrganizerIdentityCheckUnavailableException();
    }
}
