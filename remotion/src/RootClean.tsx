import { Composition } from "remotion";
import { MainVideoClean } from "./MainVideoClean";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideoClean}
    durationInFrames={420}
    fps={30}
    width={1080}
    height={1920}
  />
);
