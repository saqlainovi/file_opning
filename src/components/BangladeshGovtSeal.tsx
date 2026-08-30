import React from 'react';

/**
 * High-precision vector SVG of Bangladesh National Monogram Govt Seal
 */
export const BangladeshGovtSeal: React.FC<{ size?: number; className?: string }> = ({ 
  size = 56, 
  className = '' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={`inline-block shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Circle */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* Inner Circle */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Stars on sides */}
      {/* Left stars */}
      <text x="14" y="52" fontSize="9" fontWeight="bold" fill="currentColor" textAnchor="middle">★</text>
      <text x="17" y="66" fontSize="9" fontWeight="bold" fill="currentColor" textAnchor="middle">★</text>
      {/* Right stars */}
      <text x="86" y="52" fontSize="9" fontWeight="bold" fill="currentColor" textAnchor="middle">★</text>
      <text x="83" y="66" fontSize="9" fontWeight="bold" fill="currentColor" textAnchor="middle">★</text>

      {/* Top Arc Text: গণপ্রজাতন্ত্রী বাংলাদেশ */}
      <path id="top-arc" d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
      <text fontSize="7.5" fontWeight="bold" fill="currentColor" letterSpacing="0.5">
        <textPath href="#top-arc" startOffset="50%" textAnchor="middle">
          গণপ্রজাতন্ত্রী বাংলাদেশ
        </textPath>
      </text>

      {/* Bottom Arc Text: সরকার */}
      <path id="bottom-arc" d="M 24 70 A 38 38 0 0 0 76 70" fill="none" />
      <text fontSize="8" fontWeight="bold" fill="currentColor" letterSpacing="1">
        <textPath href="#bottom-arc" startOffset="50%" textAnchor="middle">
          সরকার
        </textPath>
      </text>

      {/* Inner Center Bangladesh Map Outline Silhouette & Inner Red/Dark Circle */}
      <circle cx="50" cy="50" r="28" fill="#111" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1" />
      
      {/* Bangladesh Map Silhouette in White inside inner circle */}
      <path
        d="M48 29 C49 28 52 28 53 30 C54 32 52 34 54 35 C56 36 58 37 57 39 C56 41 53 40 52 42 C51 44 54 46 54 48 C54 50 51 52 51 54 C51 56 53 58 52 61 C51 64 49 67 47 69 C46 70 45 68 45 66 C45 64 44 63 43 64 C42 66 40 68 39 67 C38 66 40 63 41 62 C42 60 41 57 40 55 C39 53 38 52 40 50 C41 48 44 49 45 47 C46 45 45 42 45 40 C45 37 47 34 46 32 C45 30 47 30 48 29 Z"
        fill="#ffffff"
      />
      {/* Additional delta islands */}
      <circle cx="48" cy="67" r="1.5" fill="#ffffff" />
      <circle cx="53" cy="65" r="1.3" fill="#ffffff" />
      <circle cx="43" cy="68" r="1.2" fill="#ffffff" />
    </svg>
  );
};
