package com.devguardian.pr;

import org.springframework.stereotype.Service;

@Service
public class FixApprovalService {

    /** The real gate: a fix can only move from PROPOSED to APPROVED, never skip or repeat. */
    public void assertCanApprove(PullRequestRecord record) {
        if (record.getStatus() != PRStatus.PROPOSED) {
            throw new IllegalStateException("This fix is already " + record.getStatus() + " and cannot be approved again.");
        }
    }

    public void assertCanReject(PullRequestRecord record) {
        if (record.getStatus() != PRStatus.PROPOSED) {
            throw new IllegalStateException("This fix is already " + record.getStatus() + " and cannot be rejected.");
        }
    }
}