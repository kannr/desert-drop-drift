/** 与桌面「手机框」断点一致（与 MobilePhoneFrame 同步修改） */
export const DESKTOP_PHONE_FRAME_MIN_WIDTH = 768;

/** 当前窗口是否按桌面手机框模式（宽屏） */
export function isDesktopPhoneFrame(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_PHONE_FRAME_MIN_WIDTH;
}

/** 是否微信内置浏览器 */
export function isWeChatWebView(): boolean {
  return typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
}
