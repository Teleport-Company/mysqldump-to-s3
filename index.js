const aws = require('aws-sdk')
const { createReadStream } = require('fs')
const moment = require('moment')
const mysqldump = require('mysqldump')

const s3 = new aws.S3()

exports.handler = (event, context, callback) => {
  return new Promise(async (resolve, reject) => {
    const { EXPORT_DB_HOST, EXPORT_DB_NAME, EXPORT_DB_PASSWORD, EXPORT_DB_USERNAME, EXPORT_S3_BUCKET, EXPORT_S3_PATH } = process.env

    console.log(`Exporting DB ${EXPORT_DB_NAME} to /tmp/dump.sql.gz`)

    mysqldump({
      connection: {
        host: EXPORT_DB_HOST,
        user: EXPORT_DB_USERNAME,
        password: EXPORT_DB_PASSWORD,
        database: EXPORT_DB_NAME,
      },
      dump: {
        data: {
          format: false,
        },
      },
      dumpToFile: '/tmp/dump.sql.gz',
      compressFile: true,
    })
    .then(() => {
      console.log('Create read stream to file /tmp/dump.sql.gz')
      const readStream = createReadStream('/tmp/dump.sql.gz')

      const key = dateString(`${EXPORT_S3_PATH}/${EXPORT_DB_NAME}.sql.gz`)
      const params = {
        Bucket: EXPORT_S3_BUCKET,
        Key: key,
        Body: readStream,
      }

      console.log(`Uploading dump to s3://${EXPORT_S3_BUCKET}/${key}`)

      s3.putObject(params, (err, data) => {
        if (err) {
          console.error(err)
          reject(err.toString())
        } else {
          resolve(data)
        }
      })
    })
    .catch((err) => {
      console.error(err)
      reject(err.toString())
    })
  })
}

/**
 *
 * @param template
 * @returns {string|XML}
 */
function dateString(template) {
  let date = moment()
  return template.replace(/%YYYY/, date.format('YYYY'))
  .replace(/%YY/, date.format('YY'))
  .replace(/%MM/, date.format('MM'))
  .replace(/%M/, date.format('M'))
  .replace(/%DD/, date.format('DD'))
  .replace(/%D/, date.format('D'))
}
