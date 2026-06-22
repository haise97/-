import { describe, expect, it } from 'vitest'
import { getCameraErrorLabel } from './cameraErrors.js'

describe('getCameraErrorLabel', () => {
  it('把常见摄像头错误转换为清晰中文提示', () => {
    expect(getCameraErrorLabel({ name: 'NotAllowedError' })).toBe('摄像头权限被拒绝')
    expect(getCameraErrorLabel({ name: 'NotFoundError' })).toBe('没有找到可用摄像头')
    expect(getCameraErrorLabel({ name: 'NotReadableError' })).toBe('摄像头被其他程序占用')
  })

  it('不再把普通摄像头等待误判为请求超时', () => {
    expect(getCameraErrorLabel({ name: 'AbortError' })).toBe('摄像头启动被中断')
  })

  it('为未知错误返回通用提示', () => {
    expect(getCameraErrorLabel(new Error('boom'))).toBe('摄像头启动失败')
  })
})
