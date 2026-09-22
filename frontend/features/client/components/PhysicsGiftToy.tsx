import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import AnimatedGiftIcon from '../../../components/landing/AnimatedGiftIcon';

// Golden-angle hue stepping gives a wide, ever-varying spread of vivid colors across
// bounces instead of cycling through a small fixed palette.
const HUE_STEP = 137.508;
function bounceColor(index: number) {
  const hue = (index * HUE_STEP) % 360;
  return `hsl(${hue.toFixed(1)}, 74%, 56%)`;
}

const FRICTION = 0.972;
const BOUNCE_DAMPING = 0.7;
const MIN_SPEED = 18;
// Launch speed (px/s) per pixel pulled back — how hard the slingshot fires.
const PULL_SCALE = 7;
const MAX_ARROW_LENGTH = 90;

type Props = {
  size?: number;
  // Livelier launch + longer glide, used for the fullscreen view where there's more
  // room for the gift to fly around.
  fast?: boolean;
};

// A slingshot toy: the gift stays put while you pull (drag) away from it — the arrow
// shows the opposite direction, i.e. where it's about to launch, scaled by how far
// you pulled. On release it flies, bounces off its own container's edges (changing
// color on each hit), loses speed to friction, and settles back at the center —
// keeping whatever color it last landed on rather than resetting.
export default function PhysicsGiftToy({ size = 46, fast = false }: Props) {
  const friction = fast ? 0.991 : FRICTION;
  const bounceDamping = fast ? 0.86 : BOUNCE_DAMPING;
  const minSpeed = fast ? MIN_SPEED * 0.5 : MIN_SPEED;
  const pullScale = fast ? PULL_SCALE * 1.7 : PULL_SCALE;
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [colorIndex, setColorIndex] = useState(0);
  const [arrow, setArrow] = useState<{ dx: number; dy: number } | null>(null);

  const boundsRef = useRef({ width: 0, height: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const stopLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => stopLoop, []);

  const halfExtents = () => {
    const b = boundsRef.current;
    return {
      x: Math.max(b.width / 2 - size / 2, 0),
      y: Math.max(b.height / 2 - size / 2, 0),
    };
  };

  const returnLoop = () => {
    const step = () => {
      const { x, y } = posRef.current;
      const nx = x * 0.86;
      const ny = y * 0.86;
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
      if (Math.hypot(nx, ny) < 0.6) {
        posRef.current = { x: 0, y: 0 };
        setPos({ x: 0, y: 0 });
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const flyLoop = () => {
    const step = () => {
      const half = halfExtents();
      const v = velRef.current;
      let { x, y } = posRef.current;
      x += v.x / 60;
      y += v.y / 60;
      v.x *= friction;
      v.y *= friction;

      let bounced = false;
      if (x > half.x) {
        x = half.x;
        v.x = -Math.abs(v.x) * bounceDamping;
        bounced = true;
      } else if (x < -half.x) {
        x = -half.x;
        v.x = Math.abs(v.x) * bounceDamping;
        bounced = true;
      }
      if (y > half.y) {
        y = half.y;
        v.y = -Math.abs(v.y) * bounceDamping;
        bounced = true;
      } else if (y < -half.y) {
        y = -half.y;
        v.y = Math.abs(v.y) * bounceDamping;
        bounced = true;
      }

      posRef.current = { x, y };
      velRef.current = v;
      setPos({ x, y });
      if (bounced) setColorIndex((i) => i + 1);

      if (Math.hypot(v.x, v.y) < minSpeed) {
        returnLoop();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        stopLoop();
        velRef.current = { x: 0, y: 0 };
        posRef.current = { x: 0, y: 0 };
        setPos({ x: 0, y: 0 });
      },
      onPanResponderMove: (_evt, gesture) => {
        // The gift itself stays put while pulling — only the aim arrow moves.
        setArrow({ dx: gesture.dx, dy: gesture.dy });
      },
      onPanResponderRelease: (_evt, gesture) => {
        setArrow(null);
        // Slingshot: launches opposite to the pull direction, scaled by pull distance.
        velRef.current = { x: -gesture.dx * pullScale, y: -gesture.dy * pullScale };
        flyLoop();
      },
      onPanResponderTerminate: () => {
        setArrow(null);
      },
    })
  ).current;

  const pullDistance = arrow ? Math.hypot(arrow.dx, arrow.dy) : 0;
  const arrowAngle = arrow ? (Math.atan2(-arrow.dy, -arrow.dx) * 180) / Math.PI : 0;
  const arrowLength = Math.min(pullDistance, MAX_ARROW_LENGTH);

  return (
    <View
      style={styles.playArea}
      onLayout={(e) => {
        boundsRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      }}
    >
      {arrow && arrowLength > 6 && (
        <View
          pointerEvents="none"
          style={[
            styles.arrowShaft,
            {
              width: arrowLength,
              transform: [{ rotate: `${arrowAngle}deg` }],
            },
          ]}
        >
          <View style={styles.arrowHead} />
        </View>
      )}

      <View
        {...panResponder.panHandlers}
        style={[styles.giftDraggable, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}
      >
        <AnimatedGiftIcon size={size} boxColor={bounceColor(colorIndex)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  giftDraggable: {
    cursor: 'grab' as any,
  },
  arrowShaft: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    height: 3,
    marginTop: -1.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 2,
    transformOrigin: '0% 50%' as any,
  },
  arrowHead: {
    position: 'absolute',
    right: -2,
    top: -4,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(255,255,255,0.55)',
  },
});
