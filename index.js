import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';


import express from 'express';
const app = express();
app.use(express.json());

import checkRoute from './router/check.js';
import deleteRoute from './router/deteleFile.js';
import filesRoute from './router/listFile.js';

// Express Routes
app.use('/files', filesRoute);
app.use('/check', checkRoute);
app.use('/delete', deleteRoute);


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




app.post('/upload', async (req, res) => {
  if(!req.headers['x-file-name'] || !req.headers['x-file-id']) {
    res.send({
      message: "x-file-id and x-file-name headers required"
    })
    return
  }
  
  const bucketSize = await getBucketSize();
  const usage = parseFloat((bucketSize / (1024 ** 3)).toFixed(2));
  
  if (usage > 9.5) {
      res.send({ message: "Insufficient storage. Please wait patiently before uploading again." });
      return;
    }
  
  const chunks = [];
  req.on('data', chunk => {
    chunks.push(chunk);
    console.log(chunk);
  });

  req.on('end', async () => {
    const Body = Buffer.concat(chunks);
    const Key = `${req.headers['x-file-id']}/${req.headers['x-file-name']}`;
    const fileSizeInKB = (Buffer.concat(chunks).length / 1024).toFixed(2);
    
    
let expirationTime = new Date();
const expirationHeader = req.headers['x-file-expiration'];

if (!expirationHeader) {
  expirationTime.setHours(expirationTime.getHours() + 24);
} else {
  const expirationHours = Number(expirationHeader);

  if (!Number.isInteger(expirationHours) || expirationHours <= 0) {
    return res.status(400).send({ message: "Expiration time must be a positive integer" });
  }

  if (expirationHours > 24) {
    return res.status(400).send({ message: "Time expiration can't exceed 24 hours" });
  }

  expirationTime.setHours(expirationTime.getHours() + expirationHours);
}

    
    try {
      if(Number(fileSizeInKB) > 10240) {
       res.send({"messages":"files to large"});
       return;
      }
      
      const params = {
       Body,
       Bucket: process.env.BUCKET,
       Key,
       Metadata: {
         "x-file-expiration": expirationTime.toISOString(),
         },
      };


      await s3.send(new PutObjectCommand(params));
      res.status(200).send({
        message: "success",
        fileName: Key.split("/").pop(),
        fileSize: `${fileSizeInKB} KB`,
        fileExpiredIn: expirationTime.toISOString(),
        downloadUrl: `https://s3.mininxd.web.id/${Key}`
      });
    } catch (error) {
      console.log(error);
      res.status(500).send(`Error uploading file.`);
    }
  });

  req.on('error', (err) => {
    res.status(500).send('Error processing the file.');
  });
});


app.listen(3000, () => {
  console.log('app running on :3000');
});

