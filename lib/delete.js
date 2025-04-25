import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3 = new S3Client({
  endpoint: process.env.ENDPOINT,
  region: 'auto',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.ACCESSKEY,
    secretAccessKey: process.env.SECRETACCESSKEY
  },
});


export async function deleteFile(id, filename) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.BUCKET,
    Key: `${id}/${filename}`,
  });

try {
    const result = await s3.send(command);
    return `Deleted: ${filename}`
  } catch (err) {
    return `Error deleting ${filename}: ${err.message}`;
  }
}