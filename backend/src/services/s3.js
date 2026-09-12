import crypto from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

export function keyFor(userId, filename) {
  const ext = filename.split(".").pop();
  return `users/${userId}/books/${crypto.randomUUID()}.${ext}`;
}

// Scoped, short-lived PUT url - the bucket itself never needs to be public.
export function getUploadUrl(key, contentType) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export function getReadUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export function deleteObject(key) {
  return s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
