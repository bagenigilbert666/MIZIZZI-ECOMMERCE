import * as z from "zod"

// Password requirements
const passwordRequirements = {
  minLength: 8,
  maxLength: 72, // bcrypt max length
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

// Password validation regex patterns
const passwordRegex = {
  hasNumber: /[0-9]/,
}

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Update the Kenyan phone number validation regex to support both 07 and 01 formats
// Supports formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
const kenyaPhoneRegex = /^(?:\+254|254|0)[17][0-9]{8}$/

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine((email) => emailRegex.test(email), {
      message: "Please enter a valid email address",
    }),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
})

// Update the register schema to match backend validation
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((phone) => kenyaPhoneRegex.test(phone), {
        message: "Please enter a valid Kenyan phone number",
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((password) => passwordRegex.hasNumber.test(password), {
        message: "Password must contain at least one number",
      }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const identifierSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .refine((email) => emailRegex.test(email), {
      message: "Please enter a valid email address",
    }),
})

// Update the password schema to match backend validation
export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" })
    .refine((password) => passwordRegex.hasNumber.test(password), {
      message: "Password must contain at least one number",
    }),
})

export function checkPasswordStrength(password: string): number {
  if (!password) return 0

  let strength = 0

  // Length check - most important factor
  if (password.length >= 8) strength += 1
  if (password.length >= 12) strength += 1
  if (password.length >= 16) strength += 1

  // Character variety - bonus for mixing types
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  // Give points for character variety (password like "junior2020" gets points for lowercase + numbers)
  if (hasLower) strength += 0.5
  if (hasUpper) strength += 0.5
  if (hasNumber) strength += 0.5
  if (hasSpecial) strength += 0.5

  // Cap at 5
  return Math.min(Math.round(strength), 5)
}

export function getPasswordStrengthLabel(strength: number): string {
  if (strength <= 0) return "Too Short"
  if (strength === 1) return "Weak"
  if (strength === 2) return "Fair"
  if (strength === 3) return "Good"
  if (strength === 4) return "Strong"
  return "Very Strong"
}

export function getPasswordStrengthColor(strength: number): string {
  switch (strength) {
    case 0:
      return "bg-red-500"
    case 1:
      return "bg-red-400"
    case 2:
      return "bg-amber-500"
    case 3:
      return "bg-blue-500"
    case 4:
      return "bg-emerald-500"
    case 5:
      return "bg-emerald-600"
    default:
      return "bg-gray-300"
  }
}

export function getPasswordStrengthTextColor(strength: number): string {
  switch (strength) {
    case 0:
      return "text-red-600"
    case 1:
      return "text-red-500"
    case 2:
      return "text-amber-600"
    case 3:
      return "text-blue-600"
    case 4:
      return "text-emerald-600"
    case 5:
      return "text-emerald-700"
    default:
      return "text-gray-500"
  }
}

export function validatePasswordRequirements(password: string): {
  valid: boolean
  requirements: { requirement: string; met: boolean }[]
} {
  const hasCharVariety = /[a-z]/.test(password) && /[A-Z]|[0-9]/.test(password)

  const requirements = [
    {
      requirement: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      requirement: "Mix of letters and numbers (or special characters)",
      met: hasCharVariety,
    },
  ]

  return {
    valid: requirements.every((r) => r.met),
    requirements,
  }
}

// Format Kenyan phone number to international format
export function formatKenyanPhoneNumber(phone: string): string {
  if (!phone) return phone

  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Handle different formats
  if (digits.startsWith("254")) {
    return `+${digits}`
  } else if (digits.startsWith("0")) {
    return `+254${digits.substring(1)}`
  } else if (digits.startsWith("7") || digits.startsWith("1")) {
    // Assume it's a 9-digit number without the leading 0
    if (digits.length === 9) {
      return `+254${digits}`
    }
  }

  // Return original if no pattern matches
  return phone
}
