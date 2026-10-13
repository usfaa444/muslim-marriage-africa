import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type Raster = { width: number; height: number; data: Uint8Array }

type JpegApi = {
  decode(buffer: Buffer, options?: { useTArray?: boolean; maxResolutionInMP?: number }): Raster
  encode(image: Raster, quality: number): { data: Uint8Array }
}

type PngApi = {
  PNG: {
    sync: {
      read(buffer: Buffer): { width: number; height: number; data: Uint8Array }
    }
  }
}

const jpeg = require('jpeg-js') as JpegApi
const { PNG } = require('pngjs') as PngApi

const MAX_EDGE = 32
const BLUR_RADIUS = 2
const JPEG_QUALITY = 40
const MAX_PIXELS = 8_000_000

export class PhotoDecodeError extends Error {
  constructor() {
    super('image')
    this.name = 'PhotoDecodeError'
  }
}

export function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

export function isPng(bytes: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

/** Server blur derivative. The bytes are a new JPEG, never a CSS filter of the original. */
export function blurProfilePhoto(bytes: Buffer): Buffer {
  const raster = decode(bytes)
  const small = downscale(raster, MAX_EDGE)
  const blurred = boxBlur(small, BLUR_RADIUS)
  const encoded = jpeg.encode(blurred, JPEG_QUALITY)
  return Buffer.from(encoded.data)
}

function decode(bytes: Buffer): Raster {
  try {
    const raster = isPng(bytes) ? fromPng(bytes) : fromJpeg(bytes)
    if (raster.width < 1 || raster.height < 1 || raster.width * raster.height > MAX_PIXELS) {
      throw new PhotoDecodeError()
    }
    return raster
  } catch (error) {
    if (error instanceof PhotoDecodeError) {
      throw error
    }
    throw new PhotoDecodeError()
  }
}

function fromPng(bytes: Buffer): Raster {
  const png = PNG.sync.read(bytes)
  return { width: png.width, height: png.height, data: Uint8Array.from(png.data) }
}

function fromJpeg(bytes: Buffer): Raster {
  const decoded = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 8 })
  return { width: decoded.width, height: decoded.height, data: decoded.data }
}

function downscale(source: Raster, maxEdge: number): Raster {
  const longest = Math.max(source.width, source.height)
  const scale = Math.min(1, maxEdge / longest)
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  if (width === source.width && height === source.height) {
    return source
  }
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(source.height - 1, Math.floor((y * source.height) / height))
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x * source.width) / width))
      const from = (sy * source.width + sx) * 4
      const to = (y * width + x) * 4
      data[to] = source.data[from] ?? 0
      data[to + 1] = source.data[from + 1] ?? 0
      data[to + 2] = source.data[from + 2] ?? 0
      data[to + 3] = 255
    }
  }
  return { width, height, data }
}

function boxBlur(source: Raster, radius: number): Raster {
  const { width, height, data } = source
  const out = new Uint8Array(data.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let count = 0
      for (let dy = -radius; dy <= radius; dy += 1) {
        const sy = y + dy
        if (sy < 0 || sy >= height) {
          continue
        }
        for (let dx = -radius; dx <= radius; dx += 1) {
          const sx = x + dx
          if (sx < 0 || sx >= width) {
            continue
          }
          const index = (sy * width + sx) * 4
          red += data[index] ?? 0
          green += data[index + 1] ?? 0
          blue += data[index + 2] ?? 0
          count += 1
        }
      }
      const index = (y * width + x) * 4
      out[index] = Math.round(red / count)
      out[index + 1] = Math.round(green / count)
      out[index + 2] = Math.round(blue / count)
      out[index + 3] = 255
    }
  }
  return { width, height, data: out }
}
