# Glass Morphism CSS Classes - Quick Reference

## Core Glass Utilities

### Surface Classes
```css
.glass-surface          /* Base frosted glass - 8% opacity */
.glass-elevated         /* Higher elevation glass - 12% opacity with glow */
.glass-card             /* Complete card with glass effect + padding */
.glass-bg               /* Deep navy background */
```

### Interactive Elements
```css
.glass-button           /* Glass-styled button */
.glass-button-primary   /* Primary action button with blue accent */
.glass-input            /* Glass text input */
.glass-textarea         /* Glass textarea */
.glass-select           /* Glass dropdown select */
```

### Forms & Inputs
```css
.glass-form-group       /* Container for form fields */
.glass-label            /* Form label text */
.glass-checkbox         /* Custom checkbox with glass effect */
.glass-radio            /* Custom radio button with glass effect */
```

### Status & Indicators
```css
.glass-badge            /* Base badge styling */
.glass-badge-primary    /* Blue badge */
.glass-badge-green      /* Green badge */
.glass-badge-orange     /* Orange badge */
```

### Visual Effects
```css
.glass-border           /* Luminous border */
.glass-border-lg        /* Larger luminous border */
.glass-reflection       /* Subtle reflection overlay */
.glass-glow             /* Ambient glow effect */
.glass-glow-blue        /* Blue glow (0-20px box-shadow) */
.glass-glow-purple      /* Purple glow */
.glass-glow-green       /* Green glow */
.glass-shimmer          /* Shimmer animation */
.glass-tooltip          /* Tooltip styling */
```

---

## CSS Variables (Color Tokens)

### Background Colors
```css
--glass-bg-primary        /* #0a0e27 - Main background */
--glass-bg-secondary      /* #1a1f3a - Secondary background */
```

### Glass Surfaces (Opacity Variants)
```css
--glass-surface           /* rgba(255, 255, 255, 0.08) */
--glass-surface-elevated  /* rgba(255, 255, 255, 0.12) */
--glass-surface-hover     /* rgba(255, 255, 255, 0.15) */
```

### Borders & Glows
```css
--glass-border            /* rgba(255, 255, 255, 0.12) */
--glass-border-light      /* rgba(255, 255, 255, 0.08) */
--glass-glow-blue         /* rgba(14, 165, 233, 0.15) */
--glass-glow-purple       /* rgba(167, 139, 250, 0.15) */
--glass-glow-green        /* rgba(16, 185, 129, 0.15) */
```

### Accent Colors
```css
--glass-blue              /* #0ea5e9 */
--glass-purple            /* #a78bfa */
--glass-green             /* #10b981 */
--glass-orange            /* #f97316 */
--glass-red               /* #ef4444 */
```

### Text Colors
```css
--glass-text-primary      /* #f0f4f8 - Main text */
--glass-text-secondary    /* #cbd5e1 - Secondary text */
--glass-text-muted        /* #94a3b8 - Muted/disabled text */
```

---

## Common Usage Patterns

### Simple Card
```jsx
<div className="glass-card">
  <h3 className="text-glass-text-primary">Title</h3>
  <p className="text-glass-text-secondary">Description</p>
</div>
```

### Card with Button
```jsx
<div className="glass-card">
  <h3 className="text-glass-text-primary">Action Card</h3>
  <button className="glass-button-primary mt-4">Click Me</button>
</div>
```

### Form Group
```jsx
<div className="glass-form-group">
  <label className="glass-label">Email</label>
  <input type="email" className="glass-input" />
</div>
```

### Badge
```jsx
<span className="glass-badge-primary">Active</span>
<span className="glass-badge-green">Completed</span>
<span className="glass-badge-orange">Pending</span>
```

### Data Table
```jsx
<div className="glass-card">
  <table className="w-full">
    <thead>
      <tr className="border-b glass-border">
        <th className="text-glass-text-primary">Column</th>
      </tr>
    </thead>
  </table>
</div>
```

### Modal/Dialog
```jsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="glass-elevated rounded-lg p-6 max-w-md">
    <h2 className="text-glass-text-primary">Modal Title</h2>
  </div>
</div>
```

---

## Animation Keyframes

### Available Animations
```css
glass-shimmer       /* Smooth loading shimmer */
glass-glow          /* Pulsing glow effect */
glassSlideIn        /* Entrance animation */
glassFade           /* Fade in/out animation */
fadeIn              /* Standard fade (Apple easing) */
slideUp             /* Slide up entrance */
scaleIn             /* Scale entrance */
bounceGentle        /* Gentle bounce entrance */
```

### Using Animations
```jsx
<div className="glass-shimmer">Loading...</div>

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="glass-card"
>
  Content
</motion.div>
```

---

## Responsive Behavior

All glass utilities are responsive-friendly:
```jsx
<div className="glass-card p-4 md:p-6 lg:p-8">
  Content scales with responsive padding
</div>
```

---

## Accessibility Notes

- All text maintains WCAG AA contrast ratio on glass surfaces
- Use `sr-only` class for screen reader-only text
- Ensure focus states are visible (use `.focus-visible`)
- Keyboard navigation fully supported

---

## Performance Tips

1. **Reduce blur for performance**: Change `backdrop-filter: blur(20px)` to `blur(10px)`
2. **Limit simultaneous glass elements**: Too many can impact performance
3. **Use GPU acceleration**: Stick with transform and opacity for animations
4. **Profile with DevTools**: Check for performance bottlenecks

---

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 15+)
- Fallback: CSS still applies, but blur effect won't show on older browsers

---

## Common Mistakes to Avoid

❌ **Don't mix with old colors**
```jsx
// Bad
<div className="glass-card bg-white dark:bg-gray-800">
```

✅ **Do use glass utilities consistently**
```jsx
// Good
<div className="glass-card">
```

❌ **Don't hardcode colors**
```jsx
// Bad
<div className="bg-slate-50 dark:bg-slate-950">
```

✅ **Do use CSS variables**
```jsx
// Good
<div className="glass-bg">
```

❌ **Don't use old button styles**
```jsx
// Bad
<button className="bg-white dark:bg-gray-800 border border-gray-200">
```

✅ **Do use glass buttons**
```jsx
// Good
<button className="glass-button-primary">
```

---

## Extending the System

### Add New Color Variant
```css
/* In globals.css */
--glass-indigo: #6366f1;
--glass-glow-indigo: rgba(99, 102, 241, 0.15);

.glass-badge-indigo {
  background: var(--glass-indigo);
  border-color: rgba(99, 102, 241, 0.3);
  color: white;
  box-shadow: 0 0 15px var(--glass-glow-indigo);
}
```

### Increase Glass Opacity
```css
/* More opaque glass */
--glass-surface: rgba(255, 255, 255, 0.12);
--glass-surface-elevated: rgba(255, 255, 255, 0.15);
--glass-surface-hover: rgba(255, 255, 255, 0.18);
```

### Custom Blur Strength
```css
.glass-card-soft {
  background: var(--glass-surface);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px); /* Softer blur */
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 1.5rem;
}
```

---

## Implementation Checklist

- [ ] Update main layout background to `.glass-bg`
- [ ] Convert cards to `.glass-card`
- [ ] Update text colors to `glass-text-*`
- [ ] Replace buttons with `.glass-button` or `.glass-button-primary`
- [ ] Update form inputs with `.glass-input`
- [ ] Apply `.glass-border` to separators
- [ ] Test responsive design
- [ ] Verify accessibility (contrast, focus states)
- [ ] Check browser compatibility
- [ ] Profile performance

---

This reference should help developers quickly apply the glass morphism aesthetic to any component in the admin dashboard.
