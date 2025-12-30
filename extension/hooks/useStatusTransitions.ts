import { useEffect, useRef } from 'react'
import type { Profile, AudioSettings } from '../components/settings/types'
import type { AudioEventType, AudioEventSettings } from '../components/settings/types'
import { DEFAULT_PHRASES } from '../components/settings/types'
import type { ClaudeStatus } from './useClaudeStatus'
import {
  CONTEXT_THRESHOLDS,
  READY_ANNOUNCEMENT_COOLDOWN_MS,
  STATUS_FRESHNESS_MS,
} from '../constants/audioVoices'
import { renderTemplate, type TemplateContext } from '../utils/audioTemplates'

export interface TerminalSession {
  id: string
  name: string
  profile?: Profile
  assignedVoice?: string
}

export interface UseStatusTransitionsParams {
  sessions: TerminalSession[]
  claudeStatuses: Map<string, ClaudeStatus>
  audioSettings: AudioSettings
  audioGlobalMute: boolean
  settingsLoaded: boolean
  getAudioSettingsForProfile: (profile?: Profile, assignedVoice?: string) => {
    voice: string
    rate: string
    pitch: string
    volume: number
    enabled: boolean
  }
  playAudio: (
    text: string,
    session?: TerminalSession,
    isToolAnnouncement?: boolean,
    overrides?: { pitch?: string; rate?: string; eventType?: AudioEventType }
  ) => Promise<void>
}

/**
 * Hook to track Claude status transitions and trigger appropriate audio notifications.
 * Handles: ready announcements, tool announcements, subagent changes, and context alerts.
 */
export function useStatusTransitions({
  sessions,
  claudeStatuses,
  audioSettings,
  audioGlobalMute,
  settingsLoaded,
  getAudioSettingsForProfile,
  playAudio,
}: UseStatusTransitionsParams): void {
  // Refs for tracking state transitions
  const prevClaudeStatusesRef = useRef<Map<string, string>>(new Map())
  const prevToolNamesRef = useRef<Map<string, string>>(new Map())
  const prevSubagentCountsRef = useRef<Map<string, number>>(new Map())
  const prevContextPctRef = useRef<Map<string, number>>(new Map())
  const lastReadyAnnouncementRef = useRef<Map<string, number>>(new Map())
  const lastStatusUpdateRef = useRef<Map<string, string>>(new Map())
  const announcedQuestionsRef = useRef<Map<string, string>>(new Map())  // Track announced questions to avoid repeats
  const announcedPlanApprovalRef = useRef<Map<string, boolean>>(new Map())  // Track plan approval announcements

  // Helper to get phrase template for an event type
  const getPhraseTemplate = (eventType: AudioEventType, variant?: string): string => {
    const configKey = `${eventType}Config` as keyof AudioEventSettings
    const config = audioSettings.events[configKey] as { phraseTemplate?: string } | undefined
    if (config?.phraseTemplate) {
      return config.phraseTemplate
    }
    // Use variant-specific default if provided (e.g., 'toolsWithDetails', 'subagentsComplete')
    if (variant && DEFAULT_PHRASES[variant]) {
      return DEFAULT_PHRASES[variant]
    }
    return DEFAULT_PHRASES[eventType] || '{profile}'
  }

  useEffect(() => {
    if (!settingsLoaded) return
    if (audioGlobalMute) return

    claudeStatuses.forEach((status, terminalId) => {
      const prevStatus = prevClaudeStatusesRef.current.get(terminalId)
      const prevSubagentCount = prevSubagentCountsRef.current.get(terminalId) || 0
      const currentStatus = status.status
      const currentSubagentCount = status.subagent_count || 0

      const session = sessions.find(s => s.id === terminalId)

      const audioForProfile = getAudioSettingsForProfile(session?.profile, session?.assignedVoice)
      if (!audioForProfile.enabled) {
        prevClaudeStatusesRef.current.set(terminalId, currentStatus)
        prevSubagentCountsRef.current.set(terminalId, currentSubagentCount)
        return
      }

      // Get display name for announcements (handles duplicate names)
      const getDisplayName = () => {
        if (!session) return 'Claude'
        const baseName = session.profile?.name || session.name || 'Claude'
        const sameNameSessions = sessions.filter(s =>
          (s.profile?.name || s.name) === baseName
        )
        if (sameNameSessions.length > 1) {
          const index = sameNameSessions.findIndex(s => s.id === terminalId) + 1
          return `${baseName} ${index}`
        }
        return baseName
      }

      // Ready announcement with multiple safeguards
      const now = Date.now()
      const lastReadyTime = lastReadyAnnouncementRef.current.get(terminalId) || 0
      const wasWorking = prevStatus === 'processing' || prevStatus === 'tool_use'
      const isNowReady = currentStatus === 'awaiting_input' || currentStatus === 'idle'
      const isValidTransition = wasWorking && isNowReady && currentSubagentCount === 0
      const cooldownPassed = (now - lastReadyTime) > READY_ANNOUNCEMENT_COOLDOWN_MS

      // Freshness checks to prevent stale status files from triggering audio
      const currentLastUpdated = status.last_updated || ''
      const prevLastUpdated = lastStatusUpdateRef.current.get(terminalId) || ''
      const isStatusFresh = currentLastUpdated !== prevLastUpdated && currentLastUpdated !== ''
      const statusAge = currentLastUpdated ? (now - new Date(currentLastUpdated).getTime()) : Infinity
      const isNotStale = statusAge < STATUS_FRESHNESS_MS

      const shouldPlayReady = audioSettings.events.ready &&
                              isValidTransition &&
                              cooldownPassed &&
                              isStatusFresh &&
                              isNotStale

      if (shouldPlayReady) {
        lastReadyAnnouncementRef.current.set(terminalId, now)
        lastStatusUpdateRef.current.set(terminalId, currentLastUpdated)
        const template = getPhraseTemplate('ready')
        const phrase = renderTemplate(template, { profile: getDisplayName() })
        playAudio(phrase, session, false, { eventType: 'ready' })
      }

      // Tool announcements
      const prevToolKey = prevToolNamesRef.current.get(terminalId) || ''
      const currentToolName = status.current_tool || ''
      const toolDetail = status.details?.args?.description ||
                        status.details?.args?.file_path ||
                        status.details?.args?.pattern || ''
      const currentToolKey = `${currentToolName}:${toolDetail}`
      const isActiveStatus = currentStatus === 'tool_use' || currentStatus === 'processing'
      const isNewTool = currentToolName !== '' && currentToolKey !== prevToolKey

      // Skip internal Claude session files
      const filePath = status.details?.args?.file_path || ''
      const isInternalFile = filePath && (filePath.includes('/.claude/') || filePath.includes('/session-memory/'))

      if (audioSettings.events.tools && isActiveStatus && isNewTool && !isInternalFile) {
        // Get base tool name for announcement
        let toolAction = ''
        switch (currentToolName) {
          case 'Read': toolAction = 'Reading'; break
          case 'Write': toolAction = 'Writing'; break
          case 'Edit': toolAction = 'Editing'; break
          case 'Bash': toolAction = 'Running command'; break
          case 'Glob': toolAction = 'Searching files'; break
          case 'Grep': toolAction = 'Searching code'; break
          case 'Task': toolAction = 'Spawning agent'; break
          case 'WebFetch': toolAction = 'Fetching web'; break
          case 'WebSearch': toolAction = 'Searching web'; break
          case 'AskUserQuestion': toolAction = 'Asking question'; break
          case 'EnterPlanMode': toolAction = 'Entering plan mode'; break
          case 'ExitPlanMode': toolAction = 'Presenting plan'; break
          case 'TodoWrite': toolAction = 'Updating tasks'; break
          default: toolAction = `Using ${currentToolName}`
        }

        // Build template context
        const context: TemplateContext = {
          profile: getDisplayName(),
          tool: toolAction,
        }

        // Extract filename/detail if toolDetails is enabled
        let hasDetails = false
        if (audioSettings.events.toolDetails && status.details?.args) {
          const args = status.details.args
          if (args.file_path) {
            const parts = args.file_path.split('/')
            context.filename = parts[parts.length - 1]
            hasDetails = true
          } else if (args.pattern && (currentToolName === 'Glob' || currentToolName === 'Grep')) {
            context.filename = args.pattern
            hasDetails = true
          } else if (currentToolName === 'Bash' && args.description) {
            // For Bash, override the tool action with the description
            context.tool = args.description
          }
        }

        // Get template and render
        const template = getPhraseTemplate('tools', hasDetails ? 'toolsWithDetails' : undefined)
        const phrase = renderTemplate(template, context)

        playAudio(phrase, session, true, { eventType: 'tools' })
      }

      prevToolNamesRef.current.set(terminalId, currentToolKey)

      // Subagent count changes
      if (audioSettings.events.subagents && currentSubagentCount !== prevSubagentCount) {
        if (currentSubagentCount > prevSubagentCount) {
          const template = getPhraseTemplate('subagents')
          const phrase = renderTemplate(template, {
            profile: getDisplayName(),
            count: currentSubagentCount,
          })
          playAudio(phrase, session, true, { eventType: 'subagents' })
        } else if (currentSubagentCount === 0 && prevSubagentCount > 0) {
          const template = getPhraseTemplate('subagents', 'subagentsComplete')
          const phrase = renderTemplate(template, { profile: getDisplayName() })
          playAudio(phrase, session, false, { eventType: 'subagents' })
        }
      }

      // Context threshold alerts (uses hysteresis)
      const currentContextPct = status.context_pct
      const prevContextPct = prevContextPctRef.current.get(terminalId)

      if (currentContextPct != null && prevContextPct != null) {
        const displayName = getDisplayName()

        if (audioSettings.events.contextWarning) {
          const crossedWarningUp = prevContextPct < CONTEXT_THRESHOLDS.WARNING &&
                                   currentContextPct >= CONTEXT_THRESHOLDS.WARNING
          if (crossedWarningUp) {
            const template = getPhraseTemplate('contextWarning')
            const phrase = renderTemplate(template, {
              profile: displayName,
              percentage: CONTEXT_THRESHOLDS.WARNING,
            })
            playAudio(
              phrase,
              session,
              false,
              { pitch: '+15Hz', rate: '+5%', eventType: 'contextWarning' }
            )
          }
        }

        if (audioSettings.events.contextCritical) {
          const crossedCriticalUp = prevContextPct < CONTEXT_THRESHOLDS.CRITICAL &&
                                    currentContextPct >= CONTEXT_THRESHOLDS.CRITICAL
          if (crossedCriticalUp) {
            const template = getPhraseTemplate('contextCritical')
            const phrase = renderTemplate(template, {
              profile: displayName,
              percentage: CONTEXT_THRESHOLDS.CRITICAL,
            })
            playAudio(
              phrase,
              session,
              false,
              { pitch: '+25Hz', rate: '+10%', eventType: 'contextCritical' }
            )
          }
        }
      }

      // AskUserQuestion event - announce when Claude asks a question
      if (audioSettings.events.askUserQuestion && status.current_tool === 'AskUserQuestion') {
        const questions = status.details?.args?.questions
        if (questions && questions.length > 0) {
          const firstQuestion = questions[0]
          const questionKey = `${firstQuestion.question}:${firstQuestion.options?.map(o => o.label).join(',')}`
          const lastAnnouncedQuestion = announcedQuestionsRef.current.get(terminalId)

          // Only announce if this is a new question
          if (questionKey !== lastAnnouncedQuestion) {
            announcedQuestionsRef.current.set(terminalId, questionKey)

            let optionsText = ''
            if (audioSettings.events.askUserQuestionReadOptions && firstQuestion.options) {
              const optionLabels = firstQuestion.options.map(o => o.label)
              if (optionLabels.length === 2) {
                optionsText = `${optionLabels[0]} or ${optionLabels[1]}`
              } else if (optionLabels.length > 2) {
                optionsText = optionLabels.slice(0, -1).join(', ') + ', or ' + optionLabels[optionLabels.length - 1]
              } else if (optionLabels.length === 1) {
                optionsText = optionLabels[0]
              }
            }

            const template = getPhraseTemplate('askUserQuestion')
            const phrase = renderTemplate(template, {
              title: audioSettings.userTitle,
              profile: getDisplayName(),
              question: firstQuestion.question,
              options: optionsText,
            })
            playAudio(phrase, session, false, { eventType: 'askUserQuestion' })
          }
        }
      }

      // Plan approval event - announce when ExitPlanMode is called
      if (audioSettings.events.planApproval && status.current_tool === 'ExitPlanMode') {
        const wasAnnounced = announcedPlanApprovalRef.current.get(terminalId)

        // Only announce once per plan mode session
        if (!wasAnnounced) {
          announcedPlanApprovalRef.current.set(terminalId, true)

          let optionsText = ''
          if (audioSettings.events.planApprovalReadOptions) {
            optionsText = 'Yes and bypass, Yes manual, or type to change'
          }

          const template = getPhraseTemplate('planApproval')
          const phrase = renderTemplate(template, {
            title: audioSettings.userTitle,
            profile: getDisplayName(),
            options: optionsText,
          })
          playAudio(phrase, session, false, { eventType: 'planApproval' })
        }
      }

      // Reset plan approval tracking when not in ExitPlanMode
      if (status.current_tool !== 'ExitPlanMode') {
        announcedPlanApprovalRef.current.delete(terminalId)
      }

      // Update previous values
      prevClaudeStatusesRef.current.set(terminalId, currentStatus)
      prevSubagentCountsRef.current.set(terminalId, currentSubagentCount)
      if (currentContextPct != null) {
        prevContextPctRef.current.set(terminalId, currentContextPct)
      }
    })

    // Clean up removed terminals
    for (const id of prevClaudeStatusesRef.current.keys()) {
      if (!claudeStatuses.has(id)) {
        prevClaudeStatusesRef.current.delete(id)
        prevToolNamesRef.current.delete(id)
        prevSubagentCountsRef.current.delete(id)
        prevContextPctRef.current.delete(id)
        announcedQuestionsRef.current.delete(id)
        announcedPlanApprovalRef.current.delete(id)
      }
    }
  }, [claudeStatuses, audioSettings, audioGlobalMute, settingsLoaded, sessions, getAudioSettingsForProfile, playAudio])
}
