import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const CANVAS_W = 340;
const CANVAS_H = 420;
const STROKE_COLOR = '#1a1a2e';
const STROKE_WIDTH = 3;

function pointsToPath(points) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export default function SketchCanvas({ paths, setPaths, strokeColor = STROKE_COLOR }) {
  const currentPath = useRef([]);
  const [, tick] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = [{ x: locationX, y: locationY }];
        tick((n) => n + 1);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current.push({ x: locationX, y: locationY });
        tick((n) => n + 1);
      },
      onPanResponderRelease: () => {
        if (currentPath.current.length > 1) {
          setPaths((prev) => [
            ...prev,
            {
              color: strokeColor,
              width: STROKE_WIDTH,
              points: currentPath.current.map((p) => [p.x, p.y]),
            },
          ]);
        }
        currentPath.current = [];
        tick((n) => n + 1);
      },
    })
  ).current;

  const livePath = pointsToPath(currentPath.current);

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      <Svg width={CANVAS_W} height={CANVAS_H} style={styles.svg}>
        {paths.map((path, idx) => (
          <Path
            key={`path-${idx}`}
            d={pointsToPath(path.points.map(([x, y]) => ({ x, y })))}
            stroke={path.color || STROKE_COLOR}
            strokeWidth={path.width || STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {livePath ? (
          <Path
            d={livePath}
            stroke={strokeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}

export const CANVAS_SIZE = { width: CANVAS_W, height: CANVAS_H };

const styles = StyleSheet.create({
  wrap: {
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: '#fffef8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  svg: { backgroundColor: '#fffef8' },
});
