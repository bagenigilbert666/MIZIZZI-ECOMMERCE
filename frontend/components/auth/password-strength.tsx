import {
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  getPasswordStrengthTextColor,
} from "@/lib/validations/auth"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"

export interface PasswordStrengthProps {
  strength: number




}

export function PasswordStrength({ strength }: PasswordStrengthProps) {
  const label = getPasswordStrengthLabel(strength)

  const getHint = () => {
    if (strength === 0) return { text: "Use at least 8 characters with letters and numbers", icon: Info }
    if (strength <= 2) return { text: "Try adding uppercase letters or special characters", icon: AlertCircle }
    if (strength === 3) return { text: "Good! Consider making it longer for extra security", icon: CheckCircle2 }
    return { text: "Excellent! Your password is strong", icon: CheckCircle2 }
  }

  const hint = getHint()
  const HintIcon = hint.icon

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Password strength</span>
          <span className={`font-semibold transition-colors duration-300 ${getPasswordStrengthTextColor(strength)}`}>
            {label}
          </span>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((segment) => (
            <div
              key={segment}
              className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden transition-all duration-300"
            >
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  segment <= strength ? getPasswordStrengthColor(strength) : "bg-transparent"
                }`}
                style={{
                  width: segment <= strength ? "100%" : "0%",
                  transitionDelay: `${(segment - 1) * 50}ms`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <HintIcon
          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${strength >= 3 ? "text-emerald-600" : "text-amber-600"}`}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">{hint.text}</p>
      </div>
    </div>
  )
}
