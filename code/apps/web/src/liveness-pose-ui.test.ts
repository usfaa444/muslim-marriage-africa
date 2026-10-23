import { describe, expect, it } from 'vitest'
import { LIVENESS_POSES, POSE_LABEL as API_LABEL } from '../../api/src/liveness-pose'
import { ID_REJECT_REASONS, LIVENESS_REJECT_REASONS } from '../../api/src/staff-review'
import { MEMBER_REJECT_REASON, POSE_LABEL, POSE_PICTO, poseSvg } from './liveness-pose-ui'

describe('random pose copy shared by the member page and the API', () => {
  it('has the same poses and French labels as the server list, each with a pictogram', () => {
    expect(POSE_LABEL).toEqual(API_LABEL)
    expect(Object.keys(POSE_PICTO).sort()).toEqual([...LIVENESS_POSES].sort())
    for (const pose of LIVENESS_POSES) {
      expect(poseSvg(pose)).toMatch(/^<svg viewBox="0 0 48 48"[^>]*aria-hidden="true"/)
    }
    expect(poseSvg('unknown')).toBe('')
  })

  it('explains every refusal category in French to the member', () => {
    expect(Object.keys(MEMBER_REJECT_REASON).sort()).toEqual([...ID_REJECT_REASONS, ...LIVENESS_REJECT_REASONS].sort())
  })
})
