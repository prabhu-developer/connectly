export function validateFileContent(
  buffer: Buffer,
  mimeType: string,
  extension: string
): boolean {
  if (!buffer || buffer.length === 0) return false;

  const ext = extension.toLowerCase();

  switch (mimeType) {
    case "image/png":
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case "image/jpeg":
      // JPEG magic bytes: FF D8 FF
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );

    case "image/gif":
      // GIF magic bytes: "GIF87a" or "GIF89a"
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );

    case "image/webp":
      // WebP format: "RIFF" .... "WEBP"
      return (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );

    case "application/pdf":
      // PDF header: "%PDF"
      return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF";

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // DOCX is a ZIP package starting with PK (0x50 0x4B)
      return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;

    case "application/msword":
      // Legacy DOC is an OLE compound document: D0 CF 11 E0
      return (
        buffer.length >= 4 &&
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0
      );

    case "text/plain": {
      // Text files should not contain null bytes in their initial sample
      const sample = buffer.subarray(0, Math.min(buffer.length, 512));
      return !sample.includes(0x00) && [".txt"].includes(ext);
    }

    default:
      return false;
  }
}
