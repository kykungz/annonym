const AWS = require('aws-sdk')
const config = require('../keys/config')

module.exports.s3 = new AWS.S3({
  signatureVersion: 'v4',
  accessKeyId: config.S3_KEY,
  secretAccessKey: config.S3_SECRET,
  region: config.S3_REGION,
  params: {
    Bucket: 'annonym-bucket',
  },
})
