import express from 'express';
const router = express.Router();
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: process.env.ENDPOINT,
  region: 'auto',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.ACCESSKEY,
    secretAccessKey: process.env.SECRETACCESSKEY
  },
});

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk)); 
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks))); 
  });
};




router.get('/', async (req, res) => {
  return res.send({
      "/:id": "[GET] put your id to list all your files",
      "/:id/:filename": "[GET] download your file directly",
    });
})


router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.BUCKET,
      Prefix: id + "/"
    }));
 const allFiles = result.Contents?.map(obj => obj.Key) || [];
 const files = allFiles.map(file => file.replace(`${id}/`, ''));

    res.send({ files });
  } catch (err) {
    res.status(500).send({ message: 'Could not list files' });
  }
});


router.get('/:id/:filename', async (req, res) => {
  const { id, filename } = req.params;
  
  try {
    const { Body } = await s3.send(new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: `${id}/${filename}`,
    }));

    const fileBuffer = await streamToBuffer(Body);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(fileBuffer);
  } catch (e) {
    console.error(e);
    res.status(404).send({ error: 'File not found' });
  }
});


export default router;