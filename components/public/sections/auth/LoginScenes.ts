import { Scene } from "./CinematicStage";

export const LOGIN_SCENES: Scene[] = [
  {
    tag: "Welcome",
    title: "Step back into the magic.",
    body: "Your events, your guests, and your designs are waiting exactly where you left them.",
    mode: "net", // "net" feels like connecting/returning
    hue: 0,
    floor: 0,
    dolly: [0.94, 1.06],
  },
  {
    tag: "RSVPs",
    title: "The replies are rolling in.",
    body: "Check your dashboard to see who is attending your upcoming celebration.",
    mode: "rise",
    hue: -40,
    floor: 1,
    dolly: [1, 1.12],
  },
  {
    tag: "Design",
    title: "Make a final tweak.",
    body: "Change a color, update the schedule, or add a new photo. The builder is ready.",
    mode: "warp",
    hue: -100,
    floor: 0,
    dolly: [1.08, 0.96],
  },
  {
    tag: "Enter",
    title: "Let's get back to work.",
    body: "Enter your credentials to access your dashboard.",
    mode: "net",
    hue: -360,
    floor: 0.9,
    dolly: [1.1, 0.98],
  },
];