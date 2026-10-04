import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

export type ObjectStorageSettings = {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export function objectStorageSettings(env: NodeJS.ProcessEnv): ObjectStorageSettings | null {
  const endpoint = env.S3_ENDPOINT?.trim() ?? ''
  const bucket = env.S3_BUCKET?.trim() ?? ''
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim() ?? ''
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY ?? ''
  if (endpoint === '' || bucket === '' || accessKeyId === '' || secretAccessKey === '') {
    return null
  }
  const regionText = env.S3_REGION?.trim() ?? ''
  return {
    endpoint,
    bucket,
    region: regionText === '' ? 'fr-par' : regionText,
    accessKeyId,
    secretAccessKey,
  }
}

export class ObjectStorageAdapter {
  private constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  static fromSettings(settings: ObjectStorageSettings): ObjectStorageAdapter {
    const client = new S3Client({
      region: settings.region,
      endpoint: settings.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
    })
    return new ObjectStorageAdapter(client, settings.bucket)
  }

  async createPrivateBucket(): Promise<void> {
    await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
  }

  async writeObject(key: string, body: Uint8Array): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
      }),
    )
  }

  async readObject(key: string): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )
    if (!result.Body) {
      throw new Error('object missing')
    }
    return result.Body.transformToByteArray()
  }
}
