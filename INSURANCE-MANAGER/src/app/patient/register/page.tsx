'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Lock, Calendar, CreditCard, MapPin, Home } from 'lucide-react';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const patientRegisterSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  policyNumber: z.string().min(1, 'Policy number is required'),
  companyId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PatientRegisterForm = z.infer<typeof patientRegisterSchema>;

interface Company {
  id: string;
  name: string;
  code: string;
}

export default function PatientRegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/auth/companies');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientRegisterForm>({
    resolver: zodResolver(patientRegisterSchema),
    defaultValues: {
      gender: 'Male',
    },
  });

  const onSubmit = async (data: PatientRegisterForm) => {
    setIsSubmitting(true);
    try {
      const result = await registerUser('patient', {
        ...data,
        password: data.password,
      });
      
      if (result.success) {
        toast.success('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/patient/login');
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
          <p className="text-gray-600 mt-2">
            Create your account to track insurance claims
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Already registered?{' '}
            <Link href="/patient/login" className="text-purple-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                icon={<User className="h-5 w-5 text-gray-400" />}
                error={errors.name?.message}
                {...register('name')}
                required
              />
              
              <Input
                label="Email"
                type="email"
                placeholder="patient@example.com"
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
                label="Date of Birth"
                type="date"
                icon={<Calendar className="h-5 w-5 text-gray-400" />}
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
                required
              />

              <Select
                label="Gender"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                error={errors.gender?.message}
                {...register('gender')}
                required
              />

              <Input
                label="Policy Number"
                placeholder="e.g., POL-2024-001234"
                icon={<CreditCard className="h-5 w-5 text-gray-400" />}
                error={errors.policyNumber?.message}
                {...register('policyNumber')}
                required
              />

              <Select
                label="Insurance Company (Optional)"
                options={[
                  { value: '', label: 'Select company (optional)' },
                  ...companies.map(c => ({ value: c.id, label: c.name })),
                ]}
                error={errors.companyId?.message}
                {...register('companyId')}
                disabled={loadingCompanies}
              />

              <Input
                label="Address"
                placeholder="Street address"
                icon={<Home className="h-5 w-5 text-gray-400" />}
                error={errors.address?.message}
                {...register('address')}
              />

              <Input
                label="City"
                placeholder="e.g., Mumbai"
                error={errors.city?.message}
                {...register('city')}
              />

              <Input
                label="State"
                placeholder="e.g., Maharashtra"
                error={errors.state?.message}
                {...register('state')}
              />

              <Input
                label="Pincode"
                placeholder="400001"
                error={errors.pincode?.message}
                {...register('pincode')}
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

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Register as Patient
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}