/**
 * Business Session Manager
 * Utilities for managing business context switching and session management
 */

import { 
  switchBusinessContext,
  getBusinessContext,
  clearBusinessContext,
  validateBusinessContext
} from './rls-context-management'

// Type definitions
export interface BusinessInfo {
  id: string
  name: string
  status: 'active' | 'suspended' | 'pending'
  owner_id: string
}

export interface SessionSwitchResult {
  success: boolean
  previousBusinessId: string | null
  newBusinessId: string
  businessInfo?: BusinessInfo
  error?: string
}

export interface BusinessSessionState {
  currentBusinessId: string | null
  businesses: BusinessInfo[]
  lastSwitchTime: number
  sessionStartTime: number
}

interface BusinessSwitchData {
  timestamp: number
  previousBusinessId: string | null
  newBusinessId: string
  sessionDuration: number
  switchCount: number
}

/**
 * Business Session Manager class
 * Handles business context switching and session state management
 */
export class BusinessSessionManager {
  private static instance: BusinessSessionManager
  private sessionState: BusinessSessionState
  private switchListeners: Array<(businessId: string | null) => void> = []

  private constructor() {
    this.sessionState = {
      currentBusinessId: null,
      businesses: [],
      lastSwitchTime: 0,
      sessionStartTime: Date.now()
    }
    this.initializeSession()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BusinessSessionManager {
    if (!BusinessSessionManager.instance) {
      BusinessSessionManager.instance = new BusinessSessionManager()
    }
    return BusinessSessionManager.instance
  }

  /**
   * Initialize session from stored data
   */
  private async initializeSession(): Promise<void> {
    try {
      const currentBusinessId = getBusinessContext()
      
      if (currentBusinessId) {
        this.sessionState.currentBusinessId = currentBusinessId
        await this.refreshBusinessList()
      }
    } catch (error) {
      console.warn('Failed to initialize business session:', error)
    }
  }

  /**
   * Switch to a different business context
   */
  async switchToBusiness(businessId: string): Promise<SessionSwitchResult> {
    try {
      const previousBusinessId = this.sessionState.currentBusinessId

      // Validate the target business
      const validation = await validateBusinessContext(businessId)
      if (!validation.isValid) {
        return {
          success: false,
          previousBusinessId,
          newBusinessId: businessId,
          error: validation.error || 'Invalid business context'
        }
      }

      // Perform the context switch
      const switchResult = await switchBusinessContext(businessId)
      if (!switchResult.success) {
        return {
          success: false,
          previousBusinessId,
          newBusinessId: businessId,
          error: switchResult.error
        }
      }

      // Update session state
      this.sessionState.currentBusinessId = businessId
      this.sessionState.lastSwitchTime = Date.now()

      // Get business information
      const businessInfo = validation.businessData as unknown as BusinessInfo

      // Notify listeners
      this.notifySwitchListeners(businessId)

      // Log the switch for session management
      this.logBusinessSwitch(previousBusinessId, businessId)

      return {
        success: true,
        previousBusinessId: switchResult.previousBusinessId,
        newBusinessId: businessId,
        businessInfo
      }
    } catch (error) {
      return {
        success: false,
        previousBusinessId: this.sessionState.currentBusinessId,
        newBusinessId: businessId,
        error: `Session switch error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get current business session information
   */
  getCurrentSession(): BusinessSessionState {
    return { ...this.sessionState }
  }

  /**
   * Get list of businesses the user can switch to
   */
  async getAvailableBusinesses(): Promise<BusinessInfo[]> {
    try {
      await this.refreshBusinessList()
      return [...this.sessionState.businesses]
    } catch (error) {
      console.error('Failed to get available businesses:', error)
      return []
    }
  }

  /**
   * Refresh the list of available businesses
   */
  private async refreshBusinessList(): Promise<void> {
    try {
      // Import supabase client here to avoid circular dependencies
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        this.sessionState.businesses = []
        return
      }

      // Query businesses owned by the current user
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, name, status, owner_id')
        .eq('owner_id', session.user.id)

      if (error) {
        console.error('Failed to fetch businesses:', error)
        return
      }

      this.sessionState.businesses = businesses || []
    } catch (error) {
      console.error('Error refreshing business list:', error)
    }
  }

  /**
   * Clear business session and context
   */
  async clearSession(): Promise<void> {
    try {
      await clearBusinessContext()
      this.sessionState = {
        currentBusinessId: null,
        businesses: [],
        lastSwitchTime: 0,
        sessionStartTime: Date.now()
      }
      this.notifySwitchListeners(null)
    } catch (error) {
      console.error('Failed to clear business session:', error)
    }
  }

  /**
   * Validate current session and refresh if needed
   */
  async validateSession(): Promise<boolean> {
    try {
      const currentBusinessId = this.sessionState.currentBusinessId
      
      if (!currentBusinessId) {
        return false
      }

      const validation = await validateBusinessContext(currentBusinessId)
      if (!validation.isValid) {
        // Invalid session, clear it
        await this.clearSession()
        return false
      }

      return true
    } catch (error) {
      console.error('Session validation error:', error)
      await this.clearSession()
      return false
    }
  }

  /**
   * Add listener for business context switches
   */
  addSwitchListener(listener: (businessId: string | null) => void): () => void {
    this.switchListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.switchListeners.indexOf(listener)
      if (index > -1) {
        this.switchListeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners of business context switch
   */
  private notifySwitchListeners(businessId: string | null): void {
    this.switchListeners.forEach(listener => {
      try {
        listener(businessId)
      } catch (error) {
        console.error('Error in business switch listener:', error)
      }
    })
  }

  /**
   * Log business context switch for analytics and debugging
   */
  private logBusinessSwitch(previousBusinessId: string | null, newBusinessId: string): void {
    const switchData = {
      timestamp: Date.now(),
      previousBusinessId,
      newBusinessId,
      sessionDuration: Date.now() - this.sessionState.sessionStartTime,
      switchCount: this.getSwitchCount() + 1
    }

    // Store in localStorage for session persistence
    if (typeof window !== 'undefined') {
      try {
        const existingSwitches = JSON.parse(
          localStorage.getItem('business_switches') || '[]'
        )
        existingSwitches.push(switchData)
        
        // Keep only last 10 switches to avoid storage bloat
        const recentSwitches = existingSwitches.slice(-10)
        localStorage.setItem('business_switches', JSON.stringify(recentSwitches))
      } catch (error) {
        console.warn('Failed to log business switch:', error)
      }
    }
  }

  /**
   * Get count of business switches in current session
   */
  private getSwitchCount(): number {
    if (typeof window === 'undefined') {
      return 0
    }

    try {
      const switches = JSON.parse(
        localStorage.getItem('business_switches') || '[]'
      )
      
      const sessionSwitches = switches.filter((switchData: BusinessSwitchData) => 
        switchData.timestamp >= this.sessionState.sessionStartTime
      )
      
      return sessionSwitches.length
    } catch {
      return 0
    }
  }

  /**
   * Get business switch history for current session
   */
  getSwitchHistory(): Array<{
    timestamp: number
    previousBusinessId: string | null
    newBusinessId: string
    sessionDuration: number
  }> {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const switches = JSON.parse(
        localStorage.getItem('business_switches') || '[]'
      )
      
      return switches.filter((switchData: BusinessSwitchData) => 
        switchData.timestamp >= this.sessionState.sessionStartTime
      )
    } catch {
      return []
    }
  }

  /**
   * Check if user can switch to a specific business
   */
  async canSwitchToBusiness(businessId: string): Promise<boolean> {
    try {
      const validation = await validateBusinessContext(businessId)
      return validation.isValid
    } catch {
      return false
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionDuration: number
    switchCount: number
    currentBusinessId: string | null
    businessCount: number
    lastSwitchTime: number
  } {
    return {
      sessionDuration: Date.now() - this.sessionState.sessionStartTime,
      switchCount: this.getSwitchCount(),
      currentBusinessId: this.sessionState.currentBusinessId,
      businessCount: this.sessionState.businesses.length,
      lastSwitchTime: this.sessionState.lastSwitchTime
    }
  }
}

/**
 * Convenience functions for business session management
 */

// Global session manager instance
const sessionManager = BusinessSessionManager.getInstance()

/**
 * Switch to a different business context
 */
export async function switchToBusiness(businessId: string): Promise<SessionSwitchResult> {
  return await sessionManager.switchToBusiness(businessId)
}

/**
 * Get current business session information
 */
export function getCurrentBusinessSession(): BusinessSessionState {
  return sessionManager.getCurrentSession()
}

/**
 * Get list of available businesses for switching
 */
export async function getAvailableBusinesses(): Promise<BusinessInfo[]> {
  return await sessionManager.getAvailableBusinesses()
}

/**
 * Clear business session
 */
export async function clearBusinessSession(): Promise<void> {
  await sessionManager.clearSession()
}

/**
 * Validate current business session
 */
export async function validateBusinessSession(): Promise<boolean> {
  return await sessionManager.validateSession()
}

/**
 * Add listener for business context switches
 */
export function addBusinessSwitchListener(
  listener: (businessId: string | null) => void
): () => void {
  return sessionManager.addSwitchListener(listener)
}

/**
 * Check if user can switch to a specific business
 */
export async function canSwitchToBusiness(businessId: string): Promise<boolean> {
  return await sessionManager.canSwitchToBusiness(businessId)
}

/**
 * Get business switch history
 */
export function getBusinessSwitchHistory(): Array<{
  timestamp: number
  previousBusinessId: string | null
  newBusinessId: string
  sessionDuration: number
}> {
  return sessionManager.getSwitchHistory()
}

/**
 * Get session statistics
 */
export function getBusinessSessionStats(): {
  sessionDuration: number
  switchCount: number
  currentBusinessId: string | null
  businessCount: number
  lastSwitchTime: number
} {
  return sessionManager.getSessionStats()
}

// Import React hooks for useBusinessSession hook
import { useState, useEffect } from 'react'

/**
 * React hook for business session management
 */
export function useBusinessSession() {
  const [sessionState, setSessionState] = useState<BusinessSessionState>(
    sessionManager.getCurrentSession()
  )

  useEffect(() => {
    // Subscribe to business context switches
    const unsubscribe = sessionManager.addSwitchListener(() => {
      setSessionState(sessionManager.getCurrentSession())
    })

    return unsubscribe
  }, [])

  return {
    currentBusinessId: sessionState.currentBusinessId,
    businesses: sessionState.businesses,
    switchToBusiness,
    getAvailableBusinesses,
    clearBusinessSession,
    validateBusinessSession,
    canSwitchToBusiness,
    sessionStats: sessionManager.getSessionStats()
  }
}