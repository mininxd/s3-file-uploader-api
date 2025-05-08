import express from 'express';
const router = express.Router();

import { getBucketSize } from "../lib/bucketSize.js";
import { getTotalObjects } from "../lib/totalObject.js"



router.get('/', async (req, res) => {
  try {
  const bucketSize = await getBucketSize();
  const totalObect = await getTotalObjects();
  
  const usage = (bucketSize / (1024 ** 3)).toFixed(2); 
  
    res.send({
      usage: `${usage}GB/10GB`,
      totalFiles: totalObect
    });
    
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: "Error calculating bucket size", error: error.message });
  }
});

export default router;