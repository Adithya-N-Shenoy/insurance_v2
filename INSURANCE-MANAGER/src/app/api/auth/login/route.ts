import { NextRequest, NextResponse } from 'next/server';
import {
  findHospitalUserByEmail,
  findHospitalUserByPhone,
  findAgentUserByEmail,
  findAgentUserByPhone,
  findPatientUserByEmail,
  findPatientUserByPhone,
  verifyPassword,
  getHospitalById,
  getCompanyById,
  updateHospitalUser,
  updateAgentUser,
  updatePatientUser,
} from '@/lib/firebase/repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userType, identifier, password, companyId, hospitalId } = body;

    console.log(`Login attempt for ${userType}:`, identifier);

    if (!userType || !identifier || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let user = null;
    const isEmail = identifier.includes('@');

    // Find user based on type
    if (userType === 'hospital') {
      if (isEmail) {
        user = await findHospitalUserByEmail(identifier);
      } else {
        user = await findHospitalUserByPhone(identifier);
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Verify password
      if (!verifyPassword(password, user.password_hash || '')) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Update last login
      await updateHospitalUser(user.id!, { last_login: new Date().toISOString() });

      // Get hospital details
      const hospital = user.hospital_id ? await getHospitalById(user.hospital_id) : null;

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'hospital',
          hospital_id: user.hospital_id,
          hospital_name: user.hospital_name,
          designation: user.designation,
        },
      });

    } else if (userType === 'agent') {
      // Validate company selection
      if (!companyId) {
        return NextResponse.json(
          { error: 'Please select your insurance company' },
          { status: 400 }
        );
      }

      if (isEmail) {
        user = await findAgentUserByEmail(identifier);
      } else {
        user = await findAgentUserByPhone(identifier);
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Verify company matches
      if (user.company_id !== companyId) {
        return NextResponse.json(
          { error: 'Invalid company selection' },
          { status: 401 }
        );
      }

      // Verify password
      if (!verifyPassword(password, user.password_hash || '')) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Update last login
      await updateAgentUser(user.id!, { last_login: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'agent',
          company_id: user.company_id,
          company_name: user.company_name,
          company_code: user.company_code,
          designation: user.designation,
        },
      });

    } else if (userType === 'patient') {
      if (isEmail) {
        user = await findPatientUserByEmail(identifier);
      } else {
        user = await findPatientUserByPhone(identifier);
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Verify password
      if (!verifyPassword(password, user.password_hash || '')) {
        return NextResponse.json(
          { error: 'Invalid email/phone or password' },
          { status: 401 }
        );
      }

      // Update last login
      await updatePatientUser(user.id!, { last_login: new Date().toISOString() });

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'patient',
          policy_number: user.policy_number,
          insurance_company_name: user.insurance_company_name,
        },
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}