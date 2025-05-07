import { S3Client, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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


const BUCKET = process.env.BUCKET;

export async function checkAndDeleteExpiredFiles() {
  try {
    const listParams = {
      Bucket: BUCKET,
    };

    const data = await s3.send(new ListObjectsV2Command(listParams));

    if (data.Contents.length === 0) {
      console.log('No files found in the bucket.');
      return;
    }

    for (let file of data.Contents) {
      const fileKey = file.Key;

      const metadataParams = {
        Bucket: BUCKET,
        Key: fileKey,
      };

      const metadata = await s3.send(new HeadObjectCommand(metadataParams));

      const expirationMetadata = metadata.Metadata['x-file-expiration'];

      if (expirationMetadata) {
        const expirationTime = new Date(expirationMetadata);
        const currentTime = new Date();

        if (currentTime >= expirationTime) {
          console.log(`File ${fileKey} has expired. Deleting...`);

          const deleteParams = {
            Bucket: BUCKET,
            Key: fileKey,
          };

          await s3.send(new DeleteObjectCommand(deleteParams));
          console.log(`File ${fileKey} has been deleted.`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking and deleting S3 files:', error);
  }
}


checkAndDeleteExpiredFiles()