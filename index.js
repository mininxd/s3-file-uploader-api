import express from 'express';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { deleteFile } from "./lib/delete.js";
import { getBucketSize } from "./lib/bucketSize.js";
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

app.post('/upload', async (req, res) => {
  if(!req.headers['x-file-name'] || !req.headers['x-file-id']) {
    res.send({
      message: "x-file-id and x-file-name headers required"
    })
    return
  }
  
  const bucketSize = await getBucketSize();
  const usage = (bucketSize / (1024 ** 3)).toFixed(2); 
  
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

app.get('/files', async (req, res) => {
  return res.send({
      "/:id": "[GET] put your id to list all your files",
      "/:id/:filename": "[GET] download your file directly",
    });
});


app.get('/check', async (req, res) => {
  try {
  const bucketSize = await getBucketSize();
  const usage = (bucketSize / (1024 ** 3)).toFixed(2); 
    res.send({
      usage: `${usage}GB/10GB`
    });
  } catch (error) {
    res.status(500).send({ message: "Error calculating bucket size", error: error.message });
  }
});




// deprecated, but i won't delete this
app.get('/files/:id', async (req, res) => {
  const { id } = req.params;
  const { filename } = req.query;
  
  if(!filename) {
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
} else {
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
    res.status(404).send({ error: 'File not found!' });
  }
}
});


// rather than delete old method using queries, im added multiple params for download files
app.get('/files/:id/:filename', async (req, res) => {
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

app.get('/delete/:id/:filename', async (req, res) => {
  const { id, filename } = req.params;

  try {
    const result = await deleteFile(id, filename);
    res.send(result);
  } catch (e) {
    res.status(500).send(`error: ${e.message}`);
  }
});


app.listen(3000, () => {
  console.log('app running on :3000');
});

