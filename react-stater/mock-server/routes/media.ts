import type { IncomingMessage, ServerResponse } from 'node:http';
import { Transform } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storage } from '../storage.ts';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates binary magic bytes for image formats.
 * Prevents disguised executables or scripts from being accepted.
 */
export function detectImageSignature(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * POST /api/v1/media/upload
 * Development-only endpoint to parse multipart/form-data, validate magic bytes,
 * and persist files in <MOCK_RUNTIME_DIR>/uploads/.
 */
export async function handleMediaUpload(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Content-Type must be multipart/form-data',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Enforce configured upload size limit at HTTP ingestion boundary
    const contentLengthHeader = req.headers['content-length'];
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(contentLength) && contentLength > MAX_FILE_SIZE_BYTES) {
        let drained = 0;
        req.on('data', (chunk: Buffer) => {
          drained += chunk.length;
          if (drained > 25 * 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
          if (!res.headersSent) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'X-Development-Only': 'local-mock-storage',
              Connection: 'close'
            });
            res.end(
              JSON.stringify({
                success: false,
                status: 400,
                error: 'FileTooLarge',
                message: `Upload request size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
                timestamp: new Date().toISOString()
              })
            );
          }
        });
        req.resume();
        return;
      }
    }

    // Stream bounded byte counter to safely reject chunked or unbounded streams without full buffering
    let bytesRead = 0;
    let isOversized = false;
    const boundedStream = new Transform({
      transform(chunk: Buffer, _encoding: BufferEncoding, callback) {
        bytesRead += chunk.length;
        if (bytesRead > MAX_FILE_SIZE_BYTES) {
          isOversized = true;
          req.pause();
          req.unpipe(boundedStream);
          req.on('data', () => {});
          callback(new Error('PAYLOAD_TOO_LARGE'));
          return;
        }
        callback(null, chunk);
      }
    });

    boundedStream.on('error', () => {
      // Handled in formData catch block
    });

    req.pipe(boundedStream);

    // Convert stream to web Request for streaming multipart parsing
    const url = `http://${req.headers.host || 'localhost:4000'}${req.url}`;
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: boundedStream as unknown as BodyInit,
      // @ts-expect-error Node.js fetch stream duplex requirement
      duplex: 'half'
    });

    let formData: FormData;
    try {
      formData = await webRequest.formData();
    } catch (parseErr: unknown) {
      if (isOversized || (parseErr instanceof Error && parseErr.message.includes('PAYLOAD_TOO_LARGE'))) {
        req.on('end', () => {
          if (!res.headersSent) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'X-Development-Only': 'local-mock-storage',
              Connection: 'close'
            });
            res.end(
              JSON.stringify({
                success: false,
                status: 400,
                error: 'FileTooLarge',
                message: `Uploaded file size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
                timestamp: new Date().toISOString()
              })
            );
          }
        });
        req.resume();
        return;
      }

      if (!res.headersSent) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'X-Development-Only': 'local-mock-storage'
        });
        res.end(
          JSON.stringify({
            success: false,
            status: 400,
            error: 'BadRequest',
            message: `Malformed multipart request body: ${parseErr instanceof Error ? parseErr.message : 'failed to parse form data'}`,
            timestamp: new Date().toISOString()
          })
        );
      }
      return;
    }

    const fileEntry = formData.get('file') || formData.get('image') || formData.get('media');

    if (!fileEntry || !(fileEntry instanceof Blob)) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'X-Development-Only': 'local-mock-storage'
      });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'No file found in multipart upload. Expected field "file" or "image".',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const originalName = fileEntry instanceof File ? fileEntry.name : 'upload.bin';
    const arrayBuffer = await fileEntry.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 1. File size enforcement
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'FileTooLarge',
          message: `Uploaded file size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (fileBuffer.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'EmptyFile',
          message: 'Uploaded file is empty (0 bytes).',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // 2. Binary Signature (Magic Bytes) Validation
    const detected = detectImageSignature(fileBuffer);
    if (!detected) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'InvalidFileType',
          message: 'Invalid file format. Binary signature does not match supported image types (JPEG, PNG, WebP).',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // 3. Safe unique storage filename generation
    const uniqueId = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const safeFilename = `${uniqueId}.${detected.ext}`;
    const uploadDir = storage.getUploadsDir();
    const destinationPath = path.join(uploadDir, safeFilename);

    // Guard against path traversal
    if (!destinationPath.startsWith(uploadDir)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'InvalidFilename',
          message: 'Potential path traversal detected.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Write file durably to disk
    fs.writeFileSync(destinationPath, fileBuffer);

    // Return durable, relative development URL
    const relativeUrl = `/api/v1/media/${safeFilename}`;

    res.writeHead(201, {
      'Content-Type': 'application/json',
      'X-Development-Only': 'local-mock-storage'
    });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          id: uniqueId,
          filename: safeFilename,
          originalName,
          mimeType: detected.mime,
          size: fileBuffer.length,
          url: relativeUrl
        },
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Upload processing failed';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'UploadError',
        message: errorMsg,
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * GET /api/v1/media/:mediaId
 * Serves uploaded binary files from <MOCK_RUNTIME_DIR>/uploads/.
 */
export async function handleGetMedia(
  res: ServerResponse,
  identifier: string
): Promise<void> {
  try {
    // Sanitize identifier to prevent directory traversal
    const safeBase = path.basename(identifier).trim();
    if (!safeBase || safeBase.includes('..') || !/^[a-zA-Z0-9_.-]+$/.test(safeBase)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Invalid media identifier.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const uploadDir = storage.getUploadsDir();
    let targetFilePath = path.join(uploadDir, safeBase);

    // If identifier doesn't have an extension, attempt to match prefixed file
    if (!fs.existsSync(targetFilePath)) {
      const files = fs.readdirSync(uploadDir);
      const matched = files.find((f) => f.startsWith(safeBase));
      if (matched) {
        targetFilePath = path.join(uploadDir, matched);
      }
    }

    if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Media asset '${safeBase}' not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const fileBuffer = fs.readFileSync(targetFilePath);
    const detected = detectImageSignature(fileBuffer);
    const contentType = detected ? detected.mime : 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(fileBuffer);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Media retrieval failed';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'ServerError',
        message: errorMsg,
        timestamp: new Date().toISOString()
      })
    );
  }
}
