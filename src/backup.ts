import { exec, execSync } from "child_process";
import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { createReadStream, unlink } from "fs";

import { env } from "./env";

const uploadToS3 = async ({ name, path }: {name: string, path: string}) => {
  console.log("Uploading backup to S3...");

  const bucket = env.AWS_S3_BUCKET;

  const clientOptions: S3ClientConfig = {
    region: env.AWS_S3_REGION,
  }

  if (env.AWS_S3_ENDPOINT) {
    console.log(`Using custom endpoint: ${env.AWS_S3_ENDPOINT}`)
    clientOptions['endpoint'] = env.AWS_S3_ENDPOINT;
  }

  const client = new S3Client(clientOptions);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: createReadStream(path),
    })
  )

  console.log("Backup uploaded to S3...");
}

const dumpToFile = async (path: string) => {
  console.log("Dumping DB to file...");

  // Create the backup directory if it doesn't exist
  execSync(`mkdir -p backups/${env.BACKUP_DIR}`);

  await new Promise((resolve, reject) => {
    // Run pg_dump separately from mkdir
    exec(
      `pg_dump -d ${env.BACKUP_DATABASE_URL} -x -Fc > ${path}`,
      (error, stdout, stderr) => {
        if (error) {
          console.log("error", error);
          reject({ error: JSON.stringify(error), stderr });
          return;
        }

        console.log("DB dumped to file...");
        resolve(undefined);
      }
    );
  });

}

const deleteFile = async (path: string) => {
  console.log("Deleting file...");
  await new Promise((resolve, reject) => {
    unlink(path, (err) => {
      reject({ error: JSON.stringify(err) });
      return;
    });
    resolve(undefined);
  })
}

export const backup = async () => {
  console.log("Initiating DB backup...")

  let date = new Date().toISOString()
  const backupDir = env.BACKUP_DIR || '/tmp'
  const timestamp = date.replace(/[:.]+/g, '-')
  const filename = `backup-${timestamp}.sql`
  const filepath = `backups/${backupDir}/${filename}`

  console.log('dumping to file', filepath)
  await dumpToFile(filepath)
  console.log('uploading to s3')
  await uploadToS3({name: filepath, path: filepath})
  await deleteFile(filepath)

  console.log("DB backup complete...")
}
