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

/* getGetSignedUrl generates an aws signed url to retreive an item
 * @Params
 *    key: string - the filename to be put into the s3 bucket
 * @Returns:
 *    a url as a string
 */
module.exports.getGetSignedUrl = (key) => {
  const signedUrlExpireSeconds = 60 * 5

  const url = s3.getSignedUrl('getObject', {
    Key: key,
    Expires: signedUrlExpireSeconds,
  })

  return url
}

/* getPutSignedUrl generates an aws signed url to put an item
 * @Params
 *    key: string - the filename to be retreived from s3 bucket
 * @Returns:
 *    a url as a string
 */
module.exports.getPutSignedUrl = (key) => {
  const signedUrlExpireSeconds = 60 * 3

  const url = s3.getSignedUrl('putObject', {
    Key: key,
    Expires: signedUrlExpireSeconds,
  })

  return url
}
