export interface SystemSettings {
  site: {
    name: string;
    tagline?: string;
    description?: string;
    logo_url?: string;
    favicon_url?: string;
    email?: string;
    phone?: string;
    address?: string;
    social_links?: Record<string, string>;
  };
  security: {
    password_min_length: number;
    password_requires_special_char: boolean;
    password_requires_number: boolean;
    password_requires_uppercase: boolean;
    enable_two_factor: boolean;
    max_login_attempts: number;
    lockout_time: number;
    session_lifetime: number;
  };
  maintenance: {
    maintenance_mode: boolean;
    maintenance_message: string;
  };
  // ... keep existing settings
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  store_description: string;
  default_currency: string;
  default_locale: string;
  timezone: string;
  // ... other existing settings
}