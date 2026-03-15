'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, User, Lock, MapPin, Home } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const hospitalRegisterSchema = z.object({
  // Hospital Details
  hospitalName: z.string().min(1, 'Hospital name is required'),
  hospitalAddress: z.string().min(1, 'Hospital address is required'),
  hospitalCity: z.string().min(1, 'City is required'),
  hospitalState: z.string().min(1, 'State is required'),
  hospitalPincode: z.string().min(6, 'Valid pincode is required'),
  hospitalPhone: z.string().min(10, 'Valid phone number is required'),
  
  // User Details
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  designation: z.string().min(1, 'Designation is required'),
  department: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type HospitalRegisterForm = z.infer<typeof hospitalRegisterSchema>;

export default function HospitalRegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HospitalRegisterForm>({
    resolver: zodResolver(hospitalRegisterSchema),
  });

  const onSubmit = async (data: HospitalRegisterForm) => {
    setIsSubmitting(true);
    try {
      const result = await registerUser('hospital', {
        ...data,
        password: data.password,
      });
      
      if (result.success) {
        toast.success('Registration successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/hospital');
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Hospital Registration</h1>
          <p className="text-gray-600 mt-2">
            Register your hospital and create your account
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Already registered?{' '}
            <Link href="/hospital/login" className="text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Hospital Details Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Home className="h-5 w-5 mr-2 text-blue-600" />
                Hospital Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hospital Name"
                  placeholder="e.g., City General Hospital"
                  error={errors.hospitalName?.message}
                  {...register('hospitalName')}
                  required
                />
                <Input
                  label="Hospital Phone"
                  placeholder="+91 9876543210"
                  error={errors.hospitalPhone?.message}
                  {...register('hospitalPhone')}
                  required
                />
                <div className="md:col-span-2">
                  <Input
                    label="Hospital Address"
                    placeholder="Street address"
                    error={errors.hospitalAddress?.message}
                    {...register('hospitalAddress')}
                    required
                  />
                </div>
                <Input
                  label="City"
                  placeholder="e.g., Mumbai"
                  error={errors.hospitalCity?.message}
                  {...register('hospitalCity')}
                  required
                />
                <Input
                  label="State"
                  placeholder="e.g., Maharashtra"
                  error={errors.hospitalState?.message}
                  {...register('hospitalState')}
                  required
                />
                <Input
                  label="Pincode"
                  placeholder="400001"
                  error={errors.hospitalPincode?.message}
                  {...register('hospitalPincode')}
                  required
                />
              </div>
            </div>

            {/* User Details Section */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Your Account Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  {...register('name')}
                  required
                />
                <Input
                  label="Designation"
                  placeholder="e.g., Admin, Nurse, Doctor"
                  error={errors.designation?.message}
                  {...register('designation')}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                  error={errors.email?.message}
                  {...register('email')}
                  required
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  icon={<Phone className="h-5 w-5 text-gray-400" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                  required
                />
                <Input
                  label="Department"
                  placeholder="e.g., Billing, ICU, Emergency"
                  error={errors.department?.message}
                  {...register('department')}
                />
                <Input
                  label="Password"
                  type="password"
                  icon={<Lock className="h-5 w-5 text-gray-400" />}
                  error={errors.password?.message}
                  {...register('password')}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  icon={<Lock className="h-5 w-5 text-gray-400" />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                size="lg"
              >
                Register Hospital & Create Account
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By registering, you agree to our Terms of Service and Privacy Policy.
              Your hospital details will be verified before activation.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}