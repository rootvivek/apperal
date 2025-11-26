'use client';

import { motion } from 'framer-motion';

// Animation variants for decorative blobs
const blobVariants = {
  blob1: {
    scale: [1, 1.2, 1],
    x: [0, 50, 0],
    y: [0, 30, 0],
  },
  blob2: {
    scale: [1, 1.3, 1],
    x: [0, -50, 0],
    y: [0, -30, 0],
  },
  blob3: {
    scale: [1.2, 1, 1.2],
    x: [0, 30, 0],
    y: [0, -50, 0],
  }
};

const blobTransitions = {
  blob1: { duration: 8, repeat: Infinity, ease: "easeInOut" as const },
  blob2: { duration: 10, repeat: Infinity, ease: "easeInOut" as const },
  blob3: { duration: 9, repeat: Infinity, ease: "easeInOut" as const }
};

export default function AnimatedBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        style={{ backgroundColor: '#D7882B' }}
        animate="blob1"
        variants={blobVariants}
        transition={blobTransitions.blob1}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate="blob2"
        variants={blobVariants}
        transition={blobTransitions.blob2}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate="blob3"
        variants={blobVariants}
        transition={blobTransitions.blob3}
      />
    </div>
  );
}

