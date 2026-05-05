import { MobilePhoneFrame } from "@/components/MobilePhoneFrame";
import { Tetris } from "@/components/tetris/Tetris";

/** 首页：外层统一处理桌面「手机框」与微信 WebView 视口高度 */
const Index = () => (
  <MobilePhoneFrame>
    <Tetris />
  </MobilePhoneFrame>
);

export default Index;
