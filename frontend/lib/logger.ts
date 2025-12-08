// lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error" | "log"

interface LogEntry {
  level: LogLevel
  timestamp: string
  message: string
  context?: Record<string, unknown>
  durationMs?: number
}

class Logger {
  private minLevel: number
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    log: 2,
    warn: 3,
    error: 4,
  }

  constructor(defaultLevel: LogLevel = "info") {
    this.minLevel = this.levels[defaultLevel]
    if (process.env.NODE_ENV === "development") {
      this.minLevel = this.levels.debug // Log everything in development
    } else if (process.env.NODE_ENV === "production") {
      this.minLevel = this.levels.info // Only info, warn, error in production
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.minLevel
  }

  private formatMessage(message: string, context?: Record<string, unknown>): string {
    // Keep the formatted message small and avoid stringifying the whole context.
    // Context will be passed as a separate (sanitized) console argument.
    return `[${new Date().toISOString()}] ${message}`
  }

  // Add a safe serializer that prevents circular ref errors, redacts sensitive keys,
  // truncates long strings and reduces large config/header objects to safe shapes.
  private safeSerialize(value: unknown): unknown {
    const seen = new WeakSet<object>()
    const truncate = (s: string) => (s.length > 200 ? s.substring(0, 200) + '...[TRUNCATED]' : s)

    const recurse = (v: any, key?: string): any => {
      if (v === null || typeof v === 'undefined') return v
      if (typeof v === 'function') return '[Function]'
      if (typeof v !== 'object') {
        if (typeof v === 'string') return truncate(v)
        return v
      }

      if (seen.has(v)) return '[Circular]'
      seen.add(v)

      if (Array.isArray(v)) {
        return v.map((item) => recurse(item))
      }

      const out: Record<string, any> = {}
      for (const k in v) {
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue
        const val = v[k]
        const lower = k.toLowerCase()

        // Redact very sensitive fields outright
        if (lower.includes('password') || lower.includes('token') || lower.includes('secret') || lower === 'authorization') {
          out[k] = '[REDACTED]'
          continue
        }

        // If headers, redact common sensitive header values
        if (k === 'headers' && val && typeof val === 'object') {
          const headersOut: Record<string, any> = {}
          for (const hk in val) {
            if (!Object.prototype.hasOwnProperty.call(val, hk)) continue
            const hl = hk.toLowerCase()
            if (hl === 'authorization' || hl.includes('token') || hl.includes('cookie') || hl.includes('x-xsrf-token')) {
              headersOut[hk] = '[REDACTED]'
            } else {
              headersOut[hk] = recurse(val[hk], hk)
            }
          }
          out[k] = headersOut
          continue
        }

        // For axios-like config objects, only keep a minimal safe subset
        if (k === 'config' && val && typeof val === 'object') {
          out[k] = {
            url: val.url,
            method: val.method,
            baseURL: val.baseURL,
            timeout: val.timeout,
            headers: recurse(val.headers || {}),
          }
          continue
        }

        out[k] = recurse(val, k)
      }
      return out
    }

    return recurse(value)
  }

  // Replace sanitizeContext to use the safe serializer above
  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    return (this.safeSerialize(context) as Record<string, unknown>) || {}
  }

  private output(level: LogLevel, message: string, context?: Record<string, unknown>, durationMs?: number): void {
    if (!this.shouldLog(level)) {
      return
    }

    // If context contains an error object, extract more details for debugging
    let enhancedContext = context
    if (context && (context as any).error instanceof Error) {
      const errorObj = (context as any).error as Error
      enhancedContext = {
        ...context,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        errorName: errorObj.name,
        errorCode: (errorObj as any).code,
        // Attach a safely serialized/minimal error representation instead of the raw error
        errorRaw: this.safeSerialize(errorObj),
      }
      delete (enhancedContext as any).error
    } else if (context && typeof (context as any).error === "string") {
      // Convert error string to Error object for better logging
      const errorObj = new Error((context as any).error)
      enhancedContext = {
        ...context,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        errorName: errorObj.name,
        errorRaw: this.safeSerialize(errorObj),
      }
      delete (enhancedContext as any).error
    }

    // If context contains a Response-like object with status/data, extract details for error logging
    if (
      enhancedContext &&
      typeof enhancedContext === "object" &&
      "status" in enhancedContext &&
      "data" in enhancedContext &&
      typeof (enhancedContext as any).status === "number"
    ) {
      enhancedContext = {
        ...enhancedContext,
        errorStatus: (enhancedContext as any).status,
        errorData: (enhancedContext as any).data,
      }
    }

    const formattedMessage = this.formatMessage(message, enhancedContext)
    const sanitizedForConsole = enhancedContext ? this.sanitizeContext(enhancedContext) : undefined
    const logEntry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: sanitizedForConsole,
      durationMs,
    }

    // In a real application, you might send this to a remote logging service
    // console.log(JSON.stringify(logEntry));

    switch (level) {
      case "debug":
        console.debug(formattedMessage, sanitizedForConsole)
        break
      case "info":
      case "log":
        console.log(formattedMessage, sanitizedForConsole)
        break
      case "warn":
        console.warn(formattedMessage, sanitizedForConsole)
        break
      case "error":
        // Use a separate context parameter to avoid forcing a huge serialized string
        console.error(formattedMessage, sanitizedForConsole)
        break
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.output("debug", message, context)
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.output("info", message, context)
  }

  public log(message: string, context?: Record<string, unknown>): void {
    this.output("log", message, context)
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.output("warn", message, context)
  }

  public error(message: string, context?: Record<string, unknown>): void {
    // If context contains an error, log stack trace and more details for network/backend issues
    if (context && (context as any).error instanceof Error) {
      const errorObj = (context as any).error
      this.output("error", message, {
        ...context,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        errorName: errorObj.name,
        errorCode: (errorObj as any).code,
        // ensure errorRaw is safely serialized
        errorRaw: this.safeSerialize(errorObj),
      })
    } else if (context && typeof (context as any).error === "string") {
      // Convert error string to Error object for better logging
      const errorObj = new Error((context as any).error)
      this.output("error", message, {
        ...context,
        errorMessage: errorObj.message,
        errorStack: errorObj.stack,
        errorName: errorObj.name,
        errorRaw: this.safeSerialize(errorObj),
      })
    } else {
      this.output("error", message, context)
    }
  }

  public time<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const end = performance.now()
      this.debug(`Function ${name} executed`, { durationMs: end - start })
      return result
    } catch (e) {
      const end = performance.now()
      this.error(`Function ${name} failed`, { error: (e as Error).message, durationMs: end - start })
      throw e
    }
  }

  public async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const end = performance.now()
      this.debug(`Async function ${name} executed`, { durationMs: end - start })
      return result
    } catch (e) {
      const end = performance.now()
      this.error(`Async function ${name} failed`, { error: (e as Error).message, durationMs: end - start })
      throw e
    }
  }
}

export const logger = new Logger((process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info")
