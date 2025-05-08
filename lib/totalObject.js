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

export async function getTotalObjects() {
  let count = 0;
  let Token;
  const Bucket = process.env.BUCKET;

  do {
    const { Contents, NextContinuationToken } = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        ContinuationToken: Token,
      })
    );

    count += Contents?.length || 0;
    Token = NextContinuationToken;
  } while (Token);

  return count;
}
