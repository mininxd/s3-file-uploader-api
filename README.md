### File management API with expiration time on S3 Storage

before deploy or run, edit your S3 credentials on `.env`, see `.env-example` for examples



#### How to upload use javascript :
```javascript
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

/**
 * Upload a file using raw stream (not FormData)
 * @param {string} filePath - Full path to the file to upload
 * @param {string} fileId - Unique ID, try using long random words for safety from deleting and try hide your ID when using this API
 * @param {number} exp - Expiration time in hours, maybe not working on specific S3 Object Storage
 */
 
 
function upload(filePath, fileId, exp) {
  const fileStream = fs.createReadStream(filePath);
  const fileName = path.basename(filePath);

  fetch('https://your-api-endpoint/upload', {
    method: 'POST',
    headers: {
      'x-file-id': fileId,
      'x-file-name': fileName,
      'x-file-expiration': "24", //default is 24 hours
      'Content-Type': 'application/octet-stream',
    },
    body: fileStream,
  })
  .then(res => res.json())
  .then(result => {
    console.log(result);
    console.log('Next file upload in 30 minutes!');
  })
  .catch(error => console.error('Error:', error));
}

// Example usage
upload('./hello_world.txt', 'uniqueId', 2);

```


#### How to see all your files :
```bash
curl "http://your-api-endpoint/files/:id"
```
Usage :
```bash
curl "http://your-api-endpoint/files/uniqueId"
```
Output :
```json
{
  "files": [
    "files1", "files2", "files3"
]}
```

#### How to download the files :
```bash
curl "http://your-api-endpoint/files/:id/:yourFiles"
```
Usage :
```bash
curl "http://your-api-endpoint/files/uniqueId/hello_world.txt"
```

#### How to delete the files :
```bash
curl "http://your-api-endpoint/delete/:id/:yourFiles"
```
Usage :
```bash
curl "http://your-api-endpoint/delete/uniqueId/hello_world.txt"
```