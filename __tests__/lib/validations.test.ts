import {
  loginSchema,
  registerSchema,
  createJobSchema,
  createContactSchema,
  createCrewMemberSchema,
  sendEmailSchema,
  checkoutToolSchema,
  validateRequest,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate valid login credentials', () => {
      const valid = { email: 'test@example.com', password: 'password123' };
      const result = loginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalid = { email: 'notanemail', password: 'password123' };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalid = { email: 'test@example.com', password: '12345' };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration', () => {
      const valid = {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
        company_name: 'Acme Inc',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require at least 8 character password', () => {
      const invalid = {
        email: 'test@example.com',
        password: '1234567',
        full_name: 'John Doe',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow optional company_name', () => {
      const valid = {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('createJobSchema', () => {
    it('should validate valid job', () => {
      const valid = {
        user_id: 'user123',
        name: 'Roof Repair',
        client_name: 'Jane Smith',
        status: 'active',
      };
      const result = createJobSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require user_id and name', () => {
      const invalid = { client_name: 'Jane Smith' };
      const result = createJobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate status enum', () => {
      const invalid = {
        user_id: 'user123',
        name: 'Roof Repair',
        status: 'invalid_status',
      };
      const result = createJobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const valid = {
        user_id: 'user123',
        name: 'Roof Repair',
        start_date: '2024-01-15',
      };
      const result = createJobSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const invalid = {
        user_id: 'user123',
        name: 'Roof Repair',
        start_date: '01-15-2024',
      };
      const result2 = createJobSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });
  });

  describe('createContactSchema', () => {
    it('should validate valid contact', () => {
      const valid = {
        user_id: 'user123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        type: 'customer',
      };
      const result = createContactSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require first_name', () => {
      const invalid = {
        user_id: 'user123',
        last_name: 'Doe',
      };
      const result = createContactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate contact type enum', () => {
      const valid = {
        user_id: 'user123',
        first_name: 'John',
        type: 'lead',
      };
      const result = createContactSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const invalid = {
        user_id: 'user123',
        first_name: 'John',
        type: 'invalid_type',
      };
      const result2 = createContactSchema.safeParse(invalid);
      expect(result2.success).toBe(false);
    });
  });

  describe('createCrewMemberSchema', () => {
    it('should validate valid crew member', () => {
      const valid = {
        user_id: 'user123',
        name: 'Mike Johnson',
        role: 'Foreman',
        type: 'employee',
        hourly_rate: 35.50,
      };
      const result = createCrewMemberSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate crew type enum', () => {
      const validTypes = ['employee', 'subcontractor', 'crew'];
      validTypes.forEach((type) => {
        const result = createCrewMemberSchema.safeParse({
          user_id: 'user123',
          name: 'Test',
          type,
        });
        expect(result.success).toBe(true);
      });

      const invalid = createCrewMemberSchema.safeParse({
        user_id: 'user123',
        name: 'Test',
        type: 'freelancer',
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject negative hourly rate', () => {
      const invalid = {
        user_id: 'user123',
        name: 'Test',
        hourly_rate: -10,
      };
      const result = createCrewMemberSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('sendEmailSchema', () => {
    it('should validate valid email', () => {
      const valid = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'This is the email body',
      };
      const result = sendEmailSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept array of recipients', () => {
      const valid = {
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test Subject',
        body: 'This is the email body',
      };
      const result = sendEmailSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in array', () => {
      const invalid = {
        to: ['valid@example.com', 'invalid-email'],
        subject: 'Test Subject',
        body: 'This is the email body',
      };
      const result = sendEmailSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require subject and body', () => {
      const invalid = { to: 'test@example.com' };
      const result = sendEmailSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('checkoutToolSchema', () => {
    it('should validate valid checkout', () => {
      const valid = {
        tool_id: 'tool123',
        user_id: 'user123',
        checked_out_to: 'John',
        expected_return_date: '2024-12-25',
      };
      const result = checkoutToolSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require tool_id and user_id', () => {
      const invalid = { checked_out_to: 'John' };
      const result = checkoutToolSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest helper', () => {
    it('should return success with valid data', () => {
      const result = validateRequest(loginSchema, {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return error message with invalid data', () => {
      const result = validateRequest(loginSchema, {
        email: 'invalid',
        password: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('email');
      }
    });

    it('should include field path in error message', () => {
      const result = validateRequest(createJobSchema, {
        user_id: 'test',
        name: '', // empty name should fail
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('name');
      }
    });
  });
});
