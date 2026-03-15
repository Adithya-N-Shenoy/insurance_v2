'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Lock, LogIn } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function PatientLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const result = await login('patient', data.identifier, data.password);
      if (result.success) {
        toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/patient');
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Patient Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/patient/register" className="font-medium text-purple-600 hover:text-purple-500">
              register as a new patient
            </Link>
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email or Phone"
              placeholder="Enter your email or phone number"
              icon={<Mail className="h-5 w-5 text-gray-400" />}
              error={errors.identifier?.message}
              {...register('identifier')}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock className="h-5 w-5 text-gray-400" />}
              error={errors.password?.message}
              {...register('password')}
              required
            />

            <div>
              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Demo Credentials
                </span>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600 bg-purple-50 p-4 rounded-lg">
              <p className="font-medium text-purple-800 mb-2">Demo Patient Account:</p>
              <p>Email: demo@patient.com</p>
              <p>Password: demo123</p>
              <p className="mt-2 text-xs">Policy: POL-2024-001234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}