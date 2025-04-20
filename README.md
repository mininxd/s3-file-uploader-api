### File management API with expiration time on S3 Storage

You can disable expiration time by your own, see `line 81` on `index.js` and remove the line 


before deploy or run, edit your S3 credentials on `.env`, see `.env-example`



#### How to upload use axios :
```javascript
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

function upload(filePath, fileId, exp) {
  const file = fs.createReadStream(filePath);  // Create a readable stream from the file

  const formData = new FormData();
  formData.append('file', file);

  axios.post('http://your-api-endpoint/upload', formData, {
    headers: {
      'x-file-id': // unique ID,
      'x-file-name': // fileName
      'x-file-exp': exp.toString(),  // Expiration time in hours
      ...formData.getHeaders()
    },
  })
  .then((response) => {
    console.log('Upload successful:', response.data);
  })
  .catch((error) => {
    console.error('Upload failed:', error.message);
  });
}

// Usage example: Upload file with 2 hours expiration time
upload('./path/to/your/file.txt', 'uniqueId', 2);
```


#### How to see all your files :
```bash
curl "http://your-api-endpoint/files/:id"
```
Usage :
```bash
curl "http://your-api-endpoint/files/AF38125CADE"
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
curl "http://your-api-endpoint/files/:id?file=yourFiles"
```
Usage :
```bash
curl "http://your-api-endpoint/files/AF38125CADE?file=test.txt"
```