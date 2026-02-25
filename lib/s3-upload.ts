import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Config = {
    region: process.env.AWS_REGION || 'auto',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: process.env.S3_ENDPOINT,
};

const s3Client = new S3Client(s3Config);

export const isS3Enabled = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_ENDPOINT &&
    !process.env.S3_ENDPOINT.includes('<accountid>')
);

export async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3Client.send(command);
    return key;
}

export async function getPresignedUploadUrl(filename: string, contentType: string) {
    const key = `originals/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    // URL expires in 3600 seconds (1 hour)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { url, key };
}

/**
 * CLIENT SIDE USAGE EXAMPLE:
 * 
 * async function uploadFile(file: File) {
 *   const { url, key } = await fetch('/api/upload/presigned', {
 *     method: 'POST',
 *     body: JSON.stringify({ filename: file.name, contentType: file.type }),
 *   }).then(res => res.json());
 * 
 *   await fetch(url, {
 *     method: 'PUT',
 *     body: file,
 *     headers: { 'Content-Type': file.type },
 *   });
 * 
 *   // Notify server that upload is complete to start processing
 *   await fetch('/api/upload/complete', {
 *     method: 'POST',
 *     body: JSON.stringify({ key, eventId: '...' }),
 *   });
 * }
 */
