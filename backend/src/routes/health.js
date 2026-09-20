const express = require('express');
const os = require('os');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    instance: process.env.HOSTNAME || os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
