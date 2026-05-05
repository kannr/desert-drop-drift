/**
 * 外层视口包装：桌面浏览器按手机逻辑宽高（390×844）等比缩放居中；
 * 微信内置浏览器用 visualViewport/innerHeight 同步 --app-height，缓解 WebView 与 dvh 不一致。
 */
import { type ReactNode, useLayoutEffect, useState } from "react";
import { DESKTOP_PHONE_FRAME_MIN_WIDTH } from "@/lib/viewport-mode";

/** 参照手机逻辑分辨率（约 iPhone 13 竖屏 CSS 像素） */
const REF_WIDTH = 390;
const REF_HEIGHT = 844;

/** 是否微信内置 WebView */
function detectWeChat(): boolean {
  return typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
}

/** 是否按桌面浏览器的「手机框」模式展示（宽屏即可触发） */
function detectDesktopPhoneFrame(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_PHONE_FRAME_MIN_WIDTH;
}

type Props = {
  children: ReactNode;
};

/** 桌面模式首次渲染时的缩放，避免首帧用 scale=1 撑出视口 */
function initialDesktopScale(): number {
  if (typeof window === "undefined") return 1;
  if (!detectDesktopPhoneFrame()) return 1;
  const s = Math.min(window.innerWidth / REF_WIDTH, window.innerHeight / REF_HEIGHT);
  return Math.max(0.25, Math.min(1, s));
}

/** 包裹游戏根节点：移动端全屏；桌面缩放手机框；微信写入可视高度变量 */
export function MobilePhoneFrame({ children }: Props) {
  /** 桌面模式下相对视口的缩放系数 */
  const [deskScale, setDeskScale] = useState(initialDesktopScale);
  /** 是否为桌面宽屏布局（客户端就绪后刷新） */
  const [desktopFrame, setDesktopFrame] = useState(() =>
    typeof window !== "undefined" ? detectDesktopPhoneFrame() : false
  );

  const weChat = detectWeChat();

  /** 微信 WebView：用实际可视高度覆盖 dvh，避免玩法区与侧栏栅格高度错位 */
  useLayoutEffect(() => {
    if (!weChat || desktopFrame) return;
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.max(320, Math.round(h))}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    /** 微信 WebView 从缓存恢复时 innerHeight 会变，需重刷 --app-height */
    window.addEventListener("pageshow", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.removeEventListener("pageshow", apply);
    };
  }, [weChat, desktopFrame]);

  /** 桌面：根据当前窗口宽高计算缩放，保证「手机画面」整体落在视口内 */
  useLayoutEffect(() => {
    if (!desktopFrame) return;
    const apply = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / REF_WIDTH, vh / REF_HEIGHT);
      setDeskScale(Math.max(0.25, Math.min(1, s)));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [desktopFrame]);

  /** 窗口跨越 768 时在桌面框 / 真移动端布局之间切换 */
  useLayoutEffect(() => {
    const onResize = () => setDesktopFrame(detectDesktopPhoneFrame());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (desktopFrame) {
    const sw = REF_WIDTH * deskScale;
    const sh = REF_HEIGHT * deskScale;
    return (
      <div
        className="flex items-center justify-center bg-[hsl(228_16%_14%)]"
        style={{
          width: "100%",
          minHeight: "100vh",
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* 裁剪区域等于缩放后的外接矩形 */}
        <div className="relative shrink-0 overflow-hidden rounded-[14px] shadow-2xl ring-1 ring-white/10" style={{ width: sw, height: sh }}>
          <div
            className="absolute left-0 top-0 overflow-hidden bg-[hsl(var(--background))]"
            style={{
              width: REF_WIDTH,
              height: REF_HEIGHT,
              transform: `scale(${deskScale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  /** 移动端：微信用 --app-height，其它仍用动态视口单位 */
  const mobileHeightStyle = weChat
    ? ({ height: "var(--app-height, 100vh)", minHeight: "var(--app-height, 100vh)" } as const)
    : ({ height: "100dvh", minHeight: "100dvh" } as const);

  return (
    <div className="relative w-full overflow-hidden" style={mobileHeightStyle}>
      {children}
    </div>
  );
}
