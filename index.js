import express from 'express';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk)); 
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks))); 
  });
};


const app = express();

const s3 = new S3Client({
  endpoint: process.env.ENDPOINT,
  region: 'auto',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.ACCESSKEY,
    secretAccessKey: process.env.SECRETACCESSKEY
  },
});





app.get('/', async (req, res) => {
  res.send({
    "/upload":"[POST] Upload files to S3",
    "/files":"[GET] interacting with your files"
  })
})

app.post('/upload', (req, res) => {
  if(!req.headers['x-file-name'] || !req.headers['x-file-id']) {
    res.send({
      message: "x-file-id and x-file-name headers required"
    })
    return
  }
  
  const chunks = [];
  req.on('data', chunk => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    const Body = Buffer.concat(chunks);
    const Key = `${req.headers['x-file-id']}/${req.headers['x-file-name']}`;

   let expirationTime = new Date();
   const expirationHeader = req.headers['x-file-exp'];
   
    if (!expirationHeader) {
      expirationTime.setHours(expirationTime.getHours() + 1);
    } else {
      const expirationHours = parseInt(expirationHeader, 10);
      if (isNaN(expirationHours) || expirationHours <= 0) {
        return res.status(400).send({
          message: "Expiration time must be a positive number"
        });
      }
      if (expirationHours > 24) {
        return res.status(400).send({
          message: "Time expiration can't exceed 24 hours"
        });
      }
      expirationTime.setHours(expirationTime.getHours() + expirationHours);
    }

    
    try {
      const params = {
        Body,
        Bucket: process.env.BUCKET,
        Key, 
        Metadata: {
          'x-file-expiration': expirationTime.toISOString(),
        },
      };

      await s3.send(new PutObjectCommand(params));
      res.send(params);
    } catch (error) {
      res.status(500).send(`Error uploading file: ${error.message}`);
    }
  });

  req.on('error', (err) => {
    res.status(500).send('Error processing the file.');
  });
});

app.get('/files', async (req, res) => {
  return res.send({
      "/:id": "[GET] put your id to list all your files",
      "/:id?file=": "[GET] download your file directly",
    });
});


app.get('/files/:id', async (req, res) => {
  const { id } = req.params;
  const { file } = req.query;
  
  if(!file) {
  try {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.BUCKET,
      Prefix: id + "/"
    }));

 const files = result.Contents?.map(obj => obj.Key) || [];
 const reconstructedFiles = files.map(file => file.replace(`${id}/`, ''));

    res.send({ reconstructedFiles });
  } catch (err) {
    res.status(500).send({ message: 'Could not list files' });
  }
} else {
  try {
    const { Body } = await s3.send(new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: `${id}/${file}`,
    }));

    const fileBuffer = await streamToBuffer(Body);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);

    res.send(fileBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: 'Failed to fetch the file', details: e.message });
  }
}
});



app.listen(3000);
