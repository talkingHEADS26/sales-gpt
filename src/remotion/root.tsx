import {Composition, Folder} from "remotion";
import {AbschlussIOFitnessLaunch} from "./videos/abschluss-io-fitness-launch";

export const RemotionRoot = () => {
  return (
    <Folder name="Marketing">
      <Composition
        id="AbschlussIOFitnessLaunch"
        component={AbschlussIOFitnessLaunch}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </Folder>
  );
};
