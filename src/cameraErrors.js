export const getCameraErrorLabel = (error) => {
  const labels = {
    NotAllowedError: '摄像头权限被拒绝',
    PermissionDeniedError: '摄像头权限被拒绝',
    NotFoundError: '没有找到可用摄像头',
    DevicesNotFoundError: '没有找到可用摄像头',
    NotReadableError: '摄像头被其他程序占用',
    TrackStartError: '摄像头被其他程序占用',
    OverconstrainedError: '摄像头不支持当前参数',
    AbortError: '摄像头启动被中断',
  }

  return labels[error?.name] || '摄像头启动失败'
}
