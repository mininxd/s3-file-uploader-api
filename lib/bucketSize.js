import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
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

export async function getBucketSize() {
  let continuationToken;
  let totalSize = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.BUCKET,
      ContinuationToken: continuationToken
    });
    
    const response = await s3.send(command);
    
    for (const item of response.Contents || []) {
      totalSize += item.Size;
    }
    
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return totalSize;
}