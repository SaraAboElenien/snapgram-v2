import rateLimit from 'express-rate-limit';

// Shared by signup/signin/forgetPassword/resetPassword — all endpoints where
// unlimited attempts translate directly into a credential-guessing or
// account-takeover risk (see PHASE3_SECURITY_SCOPE.md Findings 1/2).
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});
