import express from 'express';
const router = express.Router();

import { deleteFile } from "../lib/delete.js";


router.delete('/:id/:filename', async (req, res) => {
  const { id, filename } = req.params;
  try {
    const result = await deleteFile(id, filename);
    res.send(result);
  } catch (e) {
    res.status(500).send(`error: ${e.message}`);
  }
});




export default router;