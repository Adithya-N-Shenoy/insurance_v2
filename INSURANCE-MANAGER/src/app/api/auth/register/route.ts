import { NextRequest, NextResponse } from 'next/server';
import {
  createHospital,
  createHospitalUser,
  createAgentUser,
  createPatientUser,
  findCompanyByIdentifier,
  findHospitalUserByEmail,
  findHospitalUserByPhone,
  findAgentUserByEmail,
  findAgentUserByPhone,
  findPatientUserByEmail,
  findPatientUserByPhone,
  findPatientUserByPolicyNumber,
  hashPassword,
  listCompanies,
  listHospitals,
} from '@/lib/firebase/repository';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userType, ...userData } = body;

    console.log(`Registering ${userType} user:`, userData);

    // Validate required fields based on user type
    if (userType === 'hospital') {
      const { email, phone, password, name, designation, hospitalName, hospitalAddress, hospitalCity, hospitalState, hospitalPincode, hospitalPhone } = userData;
      
      if (!email || !phone || !password || !name || !designation || !hospitalName) {
        return NextResponse.json(
          { error: 'Missing required fields for hospital registration' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingEmail = await findHospitalUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      const existingPhone = await findHospitalUserByPhone(phone);
      if (existingPhone) {
        return NextResponse.json(
          { error: 'User with this phone number already exists' },
          { status: 409 }
        );
      }

      // Create hospital
      const hospital = await createHospital({
        name: hospitalName,
        address: hospitalAddress || '',
        city: hospitalCity || '',
        state: hospitalState || '',
        pincode: hospitalPincode || '',
        phone: hospitalPhone || phone,
      });

      // Create hospital user
      const user = await createHospitalUser({
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        email: email.toLowerCase(),
        phone,
        password_hash: hashPassword(password),
        name,
        designation,
        department: userData.department,
      });

      return NextResponse.json({
        success: true,
        message: 'Hospital registration successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'hospital',
          hospital_id: hospital.id,
          hospital_name: hospital.name,
        },
      });

    } else if (userType === 'agent') {
      const { email, phone, password, name, companyId, designation, licenseNumber } = userData;
      
      if (!email || !phone || !password || !name || !companyId) {
        return NextResponse.json(
          { error: 'Missing required fields for agent registration' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingEmail = await findAgentUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      const existingPhone = await findAgentUserByPhone(phone);
      if (existingPhone) {
        return NextResponse.json(
          { error: 'User with this phone number already exists' },
          { status: 409 }
        );
      }

      // Get company details
      const company = await findCompanyByIdentifier(companyId);
      if (!company) {
        return NextResponse.json(
          { error: 'Insurance company not found' },
          { status: 404 }
        );
      }

      // Create agent user
      const user = await createAgentUser({
        company_id: company.id,
        company_name: company.name,
        company_code: company.code,
        email: email.toLowerCase(),
        phone,
        password_hash: hashPassword(password),
        name,
        designation: designation || 'Agent',
        license_number: licenseNumber,
      });

      return NextResponse.json({
        success: true,
        message: 'Agent registration successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'agent',
          company_id: company.id,
          company_name: company.name,
          company_code: company.code,
        },
      });

    } else if (userType === 'patient') {
      const { email, phone, password, name, dateOfBirth, gender, policyNumber, companyId, address } = userData;
      
      if (!email || !phone || !password || !name || !policyNumber) {
        return NextResponse.json(
          { error: 'Missing required fields for patient registration' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingEmail = await findPatientUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      const existingPhone = await findPatientUserByPhone(phone);
      if (existingPhone) {
        return NextResponse.json(
          { error: 'User with this phone number already exists' },
          { status: 409 }
        );
      }

      const existingPolicy = await findPatientUserByPolicyNumber(policyNumber);
      if (existingPolicy) {
        return NextResponse.json(
          { error: 'User with this policy number already exists' },
          { status: 409 }
        );
      }

      // Get company details if provided
      let companyName;
      if (companyId) {
        const company = await findCompanyByIdentifier(companyId);
        companyName = company?.name;
      }

      // Create patient user
      const user = await createPatientUser({
        email: email.toLowerCase(),
        phone,
        password_hash: hashPassword(password),
        name,
        date_of_birth: dateOfBirth,
        gender,
        policy_number: policyNumber,
        insurance_company_id: companyId,
        insurance_company_name: companyName,
        address,
      });

      return NextResponse.json({
        success: true,
        message: 'Patient registration successful',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: 'patient',
          policy_number: user.policy_number,
        },
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}