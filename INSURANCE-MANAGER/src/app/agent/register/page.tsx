'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, User, Lock, Briefcase } from 'lucide-react';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const agentRegisterSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  companyId: z.string().min(1, 'Please select an insurance company'),
  designation: z.string().optional(),
  licenseNumber: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AgentRegisterForm = z.infer<typeof agentRegisterSchema>;

interface Company {
  id: string;
  name: string;
  code: string;
}

export default function AgentRegisterPage() {
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
  } = useForm<AgentRegisterForm>({
    resolver: zodResolver(agentRegisterSchema),
  });

  const onSubmit = async (data: AgentRegisterForm) => {
    setIsSubmitting(true);
    try {
      const result = await registerUser('agent', {
        ...data,
        password: data.password,
      });
      
      if (result.success) {
        toast.success('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/agent/login');
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Insurance Agent Registration</h1>
          <p className="text-gray-600 mt-2">
            Create your agent account
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Already registered?{' '}
            <Link href="/agent/login" className="text-green-600 hover:underline">
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
                placeholder="agent@example.com"
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

              <Select
                label="Insurance Company"
                options={companies.map(c => ({ value: c.id, label: c.name }))}
                error={errors.companyId?.message}
                {...register('companyId')}
                required
                disabled={loadingCompanies}
              />

              <Input
                label="Designation"
                placeholder="e.g., Senior Agent"
                error={errors.designation?.message}
                {...register('designation')}
              />

              <Input
                label="License Number"
                placeholder="Optional"
                error={errors.licenseNumber?.message}
                {...register('licenseNumber')}
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
                className="bg-green-600 hover:bg-green-700"
              >
                Register as Agent
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              By registering, you agree to our Terms of Service and Privacy Policy.
              Your account will be verified by the insurance company.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}