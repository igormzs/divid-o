import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
  style?: React.CSSProperties;
}

export default function Skeleton({ 
  width, 
  height, 
  borderRadius, 
  className = '',
  circle = false,
  style = {}
}: SkeletonProps) {
  const combinedStyle: React.CSSProperties = {
    width: width,
    height: height,
    borderRadius: circle ? '50%' : borderRadius,
    ...style
  };

  return (
    <div 
      className={`${styles.skeleton} ${className}`} 
      style={combinedStyle}
    />
  );
}
