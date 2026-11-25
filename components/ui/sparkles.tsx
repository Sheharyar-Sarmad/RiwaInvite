"use client";
import React, { useEffect, useId, useMemo, useState, type ComponentProps } from "react";
import Particles from "@tsparticles/react";
import { tsParticles, type Container } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "motion/react";

type ParticlesOptions = ComponentProps<typeof Particles>["options"];

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  particleSize?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};

// Initialise the engine once for the whole page
let enginePromise: Promise<void> | null = null;
const initEngine = () => {
  if (!enginePromise) {
    enginePromise = (async () => {
      await loadSlim(tsParticles);
      await tsParticles.init();
    })();
  }
  return enginePromise;
};

export const SparklesCore = (props: ParticlesProps) => {
  const {
    id,
    className,
    background,
    minSize,
    maxSize,
    speed,
    particleColor,
    particleDensity,
  } = props;
  const [init, setInit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initEngine().then(() => {
      if (!cancelled) setInit(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const controls = useAnimation();

  const particlesLoaded = async (container?: Container) => {
    if (container) {
      controls.start({
        opacity: 1,
        transition: {
          duration: 1,
        },
      });
    }
  };

  const generatedId = useId();

  const options = useMemo(
    () =>
      ({
        background: {
          color: {
            value: background || "#0d47a1",
          },
        },
        fullScreen: {
          enable: false,
          zIndex: 1,
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: "push",
            },
            onHover: {
              enable: false,
              mode: "repulse",
            },
            resize: {
              enable: true,
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 200,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: particleColor || "#ffffff",
          },
          move: {
            enable: true,
            direction: "none",
            random: false,
            straight: false,
            outModes: {
              default: "out",
            },
            speed: {
              min: 0.1,
              max: 1,
            },
          },
          number: {
            density: {
              enable: true,
              width: 400,
              height: 400,
            },
            limit: {
              mode: "delete",
              value: 0,
            },
            value: particleDensity || 120,
          },
          opacity: {
            value: {
              min: 0.1,
              max: 1,
            },
            animation: {
              enable: true,
              speed: speed || 4,
              sync: false,
              startValue: "random",
              destroy: "none",
            },
          },
          shape: {
            type: "circle",
          },
          size: {
            value: {
              min: minSize || 1,
              max: maxSize || 3,
            },
            animation: {
              enable: false,
            },
          },
          stroke: {
            width: 0,
          },
        },
        detectRetina: true,
      }) as unknown as ParticlesOptions,
    [background, particleColor, particleDensity, speed, minSize, maxSize]
  );

  return (
    <motion.div animate={controls} className={cn("opacity-0", className)}>
      {init && (
        <Particles
          id={id || generatedId}
          className={cn("h-full w-full")}
          particlesLoaded={particlesLoaded}
          options={options}
        />
      )}
    </motion.div>
  );
};