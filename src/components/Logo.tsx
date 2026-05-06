'use client';

import Image from 'next/image';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  bare?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, bare = false, className = '' }: LogoProps) {
  const imgSize = size === 'sm' ? 24 : size === 'md' ? 32 : 44;

  return (
    <div className={`${styles.logoContainer} ${styles[size]} ${className} ${bare ? styles.bare : ''}`}>
      <div className={styles.logoIcon}>
        <Image 
          src="/favicon.png" 
          alt="Divid-o Logo" 
          width={bare ? imgSize * 1.5 : imgSize} 
          height={bare ? imgSize * 1.5 : imgSize} 
          priority
        />
      </div>
      {showText && <span className={styles.logoText}>Divid-o</span>}
    </div>
  );
}
