import {
  CreateBucketCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
  PutBucketVersioningCommand,
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

function bucketAlreadyExists(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false
  }
  return error.name === 'BucketAlreadyOwnedByYou' || error.name === 'BucketAlreadyExists'
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
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
    } catch (error) {
      if (!bucketAlreadyExists(error)) {
        throw error
      }
    }
    await this.client.send(
      new PutBucketVersioningCommand({
        Bucket: this.bucket,
        VersioningConfiguration: { Status: 'Enabled' },
      }),
    )
  }

  async bucketVersioning(): Promise<string> {
    const result = await this.client.send(new GetBucketVersioningCommand({ Bucket: this.bucket }))
    return result.Status ?? ''
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
    return this.readObjectVersion(key)
  }

  async readObjectVersion(key: string, versionId?: string): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(versionId === undefined ? {} : { VersionId: versionId }),
      }),
    )
    if (!result.Body) {
      throw new Error('object missing')
    }
    return result.Body.transformToByteArray()
  }

  async listObjectVersionIds(key: string): Promise<string[]> {
    const ids: string[] = []
    let keyMarker: string | undefined
    let versionIdMarker: string | undefined
    for (;;) {
      const result = await this.client.send(
        new ListObjectVersionsCommand({
          Bucket: this.bucket,
          Prefix: key,
          ...(keyMarker === undefined ? {} : { KeyMarker: keyMarker }),
          ...(versionIdMarker === undefined ? {} : { VersionIdMarker: versionIdMarker }),
        }),
      )
      for (const entry of result.Versions ?? []) {
        if (entry.Key === key && entry.VersionId !== undefined) {
          ids.push(entry.VersionId)
        }
      }
      if (result.IsTruncated !== true || result.NextKeyMarker === undefined || result.NextVersionIdMarker === undefined) {
        return ids
      }
      keyMarker = result.NextKeyMarker
      versionIdMarker = result.NextVersionIdMarker
    }
  }

  async restoreObjectVersion(key: string, versionId: string): Promise<void> {
    await this.writeObject(key, await this.readObjectVersion(key, versionId))
  }
}
