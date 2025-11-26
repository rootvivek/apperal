'use client';

import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

interface LoginHeaderProps {
  step: 'phone' | 'otp';
}

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

export default function LoginHeader({ step }: LoginHeaderProps) {
  return (
    <div className="p-8 text-white" style={{ background: 'linear-gradient(135deg, #D7882B 0%, #B87024 100%)' }}>
      <motion.div
        className="flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="bg-white/15 backdrop-blur-md p-4 rounded-xl">
          <ShoppingBag className="w-10 h-10" />
        </div>
      </motion.div>
      <motion.h1
        className="text-center text-2xl mb-2"
        initial="hidden"
        animate="visible"
        variants={fadeVariants}
        transition={{ delay: 0.3 }}
      >
        Welcome Back
      </motion.h1>
      <motion.p
        className="text-center text-white/70 text-sm"
        initial="hidden"
        animate="visible"
        variants={fadeVariants}
        transition={{ delay: 0.4 }}
      >
        {step === 'phone' && 'Sign in to continue shopping'}
        {step === 'otp' && 'Verify your phone number'}
      </motion.p>
    </div>
  );
}

